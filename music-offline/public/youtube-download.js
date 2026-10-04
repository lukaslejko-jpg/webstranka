import { API_BASE } from "./download-config.js";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const JOB_ID = /^[a-f0-9]{32}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_BYTES = 30000000;
const ACTIVE_STATES = new Set(["queued", "preparing", "downloading", "converting"]);

export class YouTubeDownloadError extends Error {
  constructor(code) { super(code); this.name = "YouTubeDownloadError"; this.code = code; }
}

export function parseYouTubeUrl(input) {
  if (typeof input !== "string" || input.length > 2048) throw new YouTubeDownloadError("INVALID_URL");
  const text = input.trim();
  if (!/^https?:\/\//i.test(text) || /[\\\s\u0000-\u001f\u007f]/u.test(text))
    throw new YouTubeDownloadError("INVALID_URL");
  let url;
  try { url = new URL(text); } catch { throw new YouTubeDownloadError("INVALID_URL"); }
  const authority = text.match(/^https?:\/\/([^/?#]+)/i)?.[1] || "";
  if (url.username || url.password || authority.includes(":") || authority.includes("@"))
    throw new YouTubeDownloadError("INVALID_URL");
  const host = url.hostname.toLowerCase();
  const v = url.searchParams.getAll("v");
  let videoId;
  if (host === "youtu.be" || host === "www.youtu.be") {
    if (v.length || !/^\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname)) throw new YouTubeDownloadError("INVALID_URL");
    videoId = url.pathname.split("/")[1];
  } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
    if (url.pathname === "/watch" && v.length === 1) videoId = v[0];
    else if (/^\/shorts\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname) && !v.length) videoId = url.pathname.split("/")[2];
  }
  if (!VIDEO_ID.test(videoId || "")) throw new YouTubeDownloadError("INVALID_URL");
  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}

export function validYouTubeJobId(value) { return typeof value === "string" && JOB_ID.test(value); }

function checkSignal(signal) {
  if (signal?.aborted) throw signal.reason instanceof YouTubeDownloadError ? signal.reason : new YouTubeDownloadError("CANCELLED");
}

async function digest(bytes) {
  const value = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function isStoredYouTubeAudio(meta, blob) {
  if (!blob || typeof blob.arrayBuffer !== "function" || blob.size !== meta?.bytes || !SHA256.test(meta?.sha256 || "")) return false;
  return await digest(await blob.arrayBuffer()) === meta.sha256;
}

function readyMetadata(job, videoId) {
  if (job.videoId !== videoId || typeof job.title !== "string" || !job.title.trim() || job.title.length > 500 ||
      typeof job.artist !== "string" || job.artist.length > 500 || !Number.isFinite(job.durationMs) || job.durationMs <= 0 ||
      !Number.isSafeInteger(job.bytes) || job.bytes <= 0 || job.bytes > MAX_BYTES || !SHA256.test(job.sha256 || "") ||
      job.filePath !== `/api/jobs/${job.id}/audio`) throw new YouTubeDownloadError("INVALID_RESPONSE");
  return {
    videoId, title: job.title, artist: job.artist, durationMs: job.durationMs,
    bytes: job.bytes, sha256: job.sha256, filePath: job.filePath,
  };
}

const errorCode = (body, fallback) => {
  const value = typeof body?.error === "string" ? body.error : body?.error?.code || body?.code;
  return typeof value === "string" && /^[a-z][a-z0-9_]{1,63}$/i.test(value) ? value.toUpperCase() : fallback;
};

export class YouTubeDownloadClient {
  constructor({ apiBase = API_BASE, fetchImpl = (...args) => fetch(...args), pollMs = 1500, timeoutMs = 300000 } = {}) {
    this.fetch = fetchImpl;
    this.pollMs = pollMs;
    this.timeoutMs = timeoutMs;
    this.apiBase = apiBase.replace(/\/$/, "");
    if (this.apiBase) {
      const url = new URL(this.apiBase);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/")
        throw new YouTubeDownloadError("SERVICE_NOT_READY");
    }
  }

  endpoint(path) { return this.apiBase + path; }

  async json(path, options, signal) {
    checkSignal(signal);
    const response = await this.fetch(this.endpoint(path), {
      credentials: "omit", cache: "no-store", redirect: "error", ...options,
      headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) }, signal,
    });
    checkSignal(signal);
    let body;
    try { body = await response.json(); } catch { throw new YouTubeDownloadError("INVALID_RESPONSE"); }
    checkSignal(signal);
    if (!response.ok) throw new YouTubeDownloadError(errorCode(body, response.status === 404 ? "JOB_NOT_FOUND" : "SERVICE_ERROR"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new YouTubeDownloadError("INVALID_RESPONSE");
    return body;
  }

  async cancel(jobId) {
    if (!validYouTubeJobId(jobId)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try { await this.json(`/api/jobs/${jobId}`, { method: "DELETE" }, controller.signal); }
    catch { /* Expired jobs and failed network cancellation never mutate local audio. */ }
    finally { clearTimeout(timer); }
  }

  async download(input, { signal, resumeJobId = null, onJob = () => {}, onState = () => {}, getStoredAudio = async () => null } = {}) {
    const parsed = parseYouTubeUrl(input);
    if (resumeJobId !== null && !validYouTubeJobId(resumeJobId)) throw new YouTubeDownloadError("INVALID_RESPONSE");
    const controller = new AbortController();
    const cancel = () => controller.abort(new YouTubeDownloadError("CANCELLED"));
    const timer = setTimeout(() => controller.abort(new YouTubeDownloadError("TIMEOUT")), this.timeoutMs);
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    let jobId = resumeJobId;
    const active = () => checkSignal(controller.signal);
    const report = state => { active(); onState(state); };
    try {
      active();
      let job;
      if (jobId) job = await this.json(`/api/jobs/${jobId}`, { method: "GET" }, controller.signal);
      else job = await this.json("/api/jobs", { method: "POST", body: JSON.stringify({ url: parsed.url }) }, controller.signal);
      active();
      if (!validYouTubeJobId(job.id) || (jobId && job.id !== jobId)) throw new YouTubeDownloadError("INVALID_RESPONSE");
      jobId = job.id;
      onJob({ id: jobId, ...parsed });
      while (true) {
        active();
        if (job.id !== jobId) throw new YouTubeDownloadError("INVALID_RESPONSE");
        if (job.state === "failed") throw new YouTubeDownloadError(errorCode(job, "DOWNLOAD_FAILED"));
        if (job.state === "cancelled") throw new YouTubeDownloadError("CANCELLED");
        if (job.state === "ready") break;
        if (!ACTIVE_STATES.has(job.state)) throw new YouTubeDownloadError("INVALID_RESPONSE");
        report(job.state);
        await new Promise((resolve, reject) => {
          const stop = () => { clearTimeout(wait); reject(controller.signal.reason); };
          const wait = setTimeout(() => { controller.signal.removeEventListener("abort", stop); resolve(); }, this.pollMs);
          controller.signal.addEventListener("abort", stop, { once: true });
        });
        active();
        job = await this.json(`/api/jobs/${jobId}`, { method: "GET" }, controller.signal);
      }
      const meta = readyMetadata(job, parsed.videoId);
      // A retry after metadata failure can reuse a fully committed local Blob.
      const stored = await getStoredAudio(meta);
      active();
      if (await isStoredYouTubeAudio(meta, stored)) { active(); return { meta, blob: stored, reused: true }; }
      report("transferring");
      const response = await this.fetch(this.endpoint(meta.filePath), {
        signal: controller.signal, credentials: "omit", redirect: "error", cache: "no-store",
      });
      active();
      if (!response.ok) {
        let body;
        try { body = await response.json(); } catch {}
        throw new YouTubeDownloadError(errorCode(body, response.status === 404 ? "JOB_NOT_FOUND" : "DOWNLOAD_FAILED"));
      }
      const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (response.status !== 200 || !["audio/mpeg", "audio/mp3", "application/octet-stream"].includes(type))
        throw new YouTubeDownloadError("INVALID_AUDIO");
      const length = response.headers.get("content-length");
      if (length && Number(length) !== meta.bytes) throw new YouTubeDownloadError("INVALID_AUDIO");
      const parts = [];
      let size = 0;
      if (response.body?.getReader) {
        const reader = response.body.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            active();
            if (done) break;
            size += value.byteLength;
            if (size > meta.bytes) throw new YouTubeDownloadError("INVALID_AUDIO");
            parts.push(value);
          }
        } finally { try { await reader.cancel(); } catch {} reader.releaseLock(); }
      } else {
        const value = await response.arrayBuffer();
        active(); size = value.byteLength; parts.push(value);
      }
      if (size !== meta.bytes) throw new YouTubeDownloadError("INVALID_AUDIO");
      const blob = new Blob(parts, { type: "audio/mpeg" });
      if (!await isStoredYouTubeAudio(meta, blob)) throw new YouTubeDownloadError("INVALID_AUDIO");
      active();
      return { meta, blob, reused: false };
    } catch (error) {
      if (controller.signal.aborted) throw controller.signal.reason;
      if (error instanceof YouTubeDownloadError || error?.name === "QuotaExceededError") throw error;
      throw new YouTubeDownloadError("NETWORK_ERROR");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      if (controller.signal.aborted && jobId) void this.cancel(jobId);
    }
  }
}
