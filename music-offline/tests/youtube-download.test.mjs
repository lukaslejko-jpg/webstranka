import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  YouTubeDownloadClient,
  YouTubeDownloadError,
  isStoredYouTubeAudio,
  parseYouTubeUrl,
  validYouTubeJobId,
} from "../public/youtube-download.js";

// Exercise the actual client with Node's Response, ReadableStream, Blob, and
// Web Crypto. Only the remote API is replaced. These small synthetic bytes test
// transfer integrity, not MP3 decoding or playback on a physical phone.
const ORIGIN = "https://download.example";
const VIDEO = "BaW_jenozKc";
const OTHER_VIDEO = "a1B2c3D4e5F";
const CANONICAL = `https://www.youtube.com/watch?v=${VIDEO}`;
const JOB = "1a".repeat(16);
const OTHER_JOB = "2b".repeat(16);
const JOB_PATH = `/api/jobs/${JOB}`;
const AUDIO_PATH = `${JOB_PATH}/audio`;
const BYTES = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 4, 77, 117, 115, 105, 99]);
const SHA = createHash("sha256").update(BYTES).digest("hex");
const metadata = {
  videoId: VIDEO,
  title: "Skúšobná skladba · café",
  artist: "Music test",
  durationMs: 54321,
  bytes: BYTES.byteLength,
  sha256: SHA,
  filePath: AUDIO_PATH,
};
const ready = changes => ({ id: JOB, state: "ready", ...metadata, ...changes });
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
const audio = (bytes = BYTES, headers = {}, status = 200) => new Response(bytes, {
  status, headers: { "Content-Type": "audio/mpeg", ...headers },
});
const coded = code => error => error instanceof YouTubeDownloadError && error.code === code;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function api(steps, options = {}) {
  const requests = [];
  const client = new YouTubeDownloadClient({
    apiBase: `${ORIGIN}/`, pollMs: 0, timeoutMs: 1000, ...options,
    async fetchImpl(url, init = {}) {
      const index = requests.length;
      requests.push({ url, method: init.method || "GET", init });
      if (!steps[index]) throw new Error("Unexpected remote request");
      return steps[index].reply(init);
    },
  });
  return {
    client,
    requests,
    assertComplete() {
      assert.deepEqual(
        requests.map(({ url, method }) => ({ url, method })),
        steps.map(({ path, method = "GET" }) => ({ url: ORIGIN + path, method })),
      );
      for (const request of requests) {
        assert.equal(request.init.credentials, "omit");
        assert.equal(request.init.cache, "no-store");
        assert.equal(request.init.redirect, "error");
        assert.ok(request.init.signal instanceof AbortSignal);
        if (request.method === "POST") {
          assert.equal(request.init.body, JSON.stringify({ url: CANONICAL }));
          assert.equal(new Headers(request.init.headers).get("content-type"), "application/json");
        } else {
          assert.equal(request.init.body, undefined);
        }
        if (!request.url.endsWith("/audio")) {
          assert.equal(new Headers(request.init.headers).get("accept"), "application/json");
        }
      }
    },
  };
}

const post = body => ({ path: "/api/jobs", method: "POST", reply: () => json(body) });
const get = body => ({ path: JOB_PATH, reply: () => json(body) });
const file = reply => ({ path: AUDIO_PATH, reply: reply || (() => audio()) });
const deletion = () => ({ path: JOB_PATH, method: "DELETE", reply: () => json({ id: JOB, state: "cancelled" }) });

test("YouTube links become one HTTPS video URL; share, playlist, timestamp, and command-like query values are discarded", () => {
  for (const value of [
    CANONICAL,
    `http://youtube.com/watch?v=${VIDEO}`,
    `HTTPS://M.YOUTUBE.COM/watch?v=${VIDEO}`,
    `https://music.youtube.com/watch?v=${VIDEO}&list=PL_example&index=4`,
    `https://www.youtube.com/watch?feature=share&v=${VIDEO}&t=15`,
    `https://youtu.be/${VIDEO}`,
    `https://www.youtu.be/${VIDEO}/?si=shared#t=20`,
    `https://www.youtube.com/shorts/${VIDEO}`,
    `https://m.youtube.com/shorts/${VIDEO}/?feature=share`,
    `  https://youtu.be/${VIDEO}?t=15  `,
    `${CANONICAL}&command=%24%28echo%20never%29&output=../../file.mp3`,
    `${CANONICAL}#--exec=never`,
  ]) {
    assert.deepEqual(parseYouTubeUrl(value), { videoId: VIDEO, url: CANONICAL }, value);
  }
});

test("invalid, ambiguous, credentialed, port-bearing, and command-like inputs fail before any remote call", async () => {
  const remote = api([]);
  const inputs = [
    null, undefined, 123, {}, "", " ", VIDEO, "https://", "x".repeat(2049),
    `//www.youtube.com/watch?v=${VIDEO}`,
    `ftp://www.youtube.com/watch?v=${VIDEO}`,
    `javascript:${CANONICAL}`,
    `file:///watch?v=${VIDEO}`,
    `https://www.youtube.com.evil.example/watch?v=${VIDEO}`,
    `https://youtube.example/watch?v=${VIDEO}`,
    `https://localhost/watch?v=${VIDEO}`,
    `https://127.0.0.1/watch?v=${VIDEO}`,
    `https://www.youtube.com:443/watch?v=${VIDEO}`,
    `http://www.youtube.com:80/watch?v=${VIDEO}`,
    `https://user:password@www.youtube.com/watch?v=${VIDEO}`,
    `https://@www.youtube.com/watch?v=${VIDEO}`,
    `https://www.youtube.com@evil.example/watch?v=${VIDEO}`,
    `https://www.youtube.com\\@evil.example/watch?v=${VIDEO}`,
    `https://www.you\ntube.com/watch?v=${VIDEO}`,
    `https://www.you\u0000tube.com/watch?v=${VIDEO}`,
    `https://www.youtube.com/watch?v=${VIDEO}&v=${VIDEO}`,
    `https://www.youtube.com/watch?v=${VIDEO}&v=${OTHER_VIDEO}`,
    `https://www.youtube.com/watch?v=&v=${VIDEO}`,
    `https://www.youtube.com/watch?v=${VIDEO}%26extra`,
    "https://www.youtube.com/watch?v=too-short",
    "https://www.youtube.com/playlist?list=PL_example",
    `https://www.youtube.com/watch/?v=${VIDEO}`,
    `https://www.youtube.com/shorts/${VIDEO}?v=${VIDEO}`,
    `https://youtu.be/${VIDEO}?v=${VIDEO}`,
    `https://youtu.be/${VIDEO}/another`,
    `https://www.youtube.com/watch?v=${VIDEO};touch`,
    `${CANONICAL} --exec echo`,
    `$(curl ${CANONICAL})`,
  ];
  for (const value of inputs) {
    assert.throws(() => parseYouTubeUrl(value), coded("INVALID_URL"), String(value));
    await assert.rejects(remote.client.download(value), coded("INVALID_URL"), String(value));
  }
  remote.assertComplete();
});

test("job identifiers are opaque lowercase hex and invalid resume/cancel IDs cannot create requests", async () => {
  assert.equal(validYouTubeJobId(JOB), true);
  const remote = api([]);
  for (const value of [undefined, 123, {}, "", "a".repeat(31), "a".repeat(33), JOB.toUpperCase(), "g".repeat(32), "../../api/jobs", `${JOB}/audio`]) {
    assert.equal(validYouTubeJobId(value), false);
    // An omitted resume ID requests a new job, so test it only as an invalid cancel ID.
    if (value !== undefined) {
      await assert.rejects(remote.client.download(CANONICAL, { resumeJobId: value }), coded("INVALID_RESPONSE"));
    }
    await remote.client.cancel(value);
  }
  remote.assertComplete();
});

test("one canonical POST, bounded job polling, and a verified MP3 Blob preserve the reported title and duration", async () => {
  const remote = api([
    post({ id: JOB, state: "queued" }),
    get({ id: JOB, state: "preparing" }),
    get({ id: JOB, state: "downloading" }),
    get({ id: JOB, state: "converting" }),
    get(ready()),
    file(() => audio(BYTES, { "Content-Length": String(BYTES.byteLength) })),
  ]);
  const states = [], jobs = [], lookedUp = [];
  const result = await remote.client.download(`https://youtu.be/${VIDEO}?list=ignored&t=15`, {
    onState: state => states.push(state),
    onJob: job => jobs.push(job),
    getStoredAudio: async meta => { lookedUp.push(meta); return null; },
  });
  assert.deepEqual(states, ["queued", "preparing", "downloading", "converting", "transferring"]);
  assert.deepEqual(jobs, [{ id: JOB, videoId: VIDEO, url: CANONICAL }]);
  assert.deepEqual(lookedUp, [metadata]);
  assert.deepEqual(result.meta, metadata);
  assert.equal(result.meta.durationMs, 54321);
  assert.equal(result.reused, false);
  assert.ok(result.blob instanceof Blob);
  assert.equal(result.blob.type, "audio/mpeg");
  assert.equal(result.blob.size, metadata.bytes);
  assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()), BYTES);
  assert.equal(await isStoredYouTubeAudio(result.meta, result.blob), true);
  remote.assertComplete();
});

test("resuming queries the exact saved job and downloads its audio without posting another conversion", async () => {
  const remote = api([get({ id: JOB, state: "converting" }), get(ready()), file()]);
  const result = await remote.client.download(CANONICAL, { resumeJobId: JOB });
  assert.equal(result.reused, false);
  assert.equal(result.blob.size, BYTES.byteLength);
  remote.assertComplete();
});

test("an existing Blob is reused only after actual size and SHA-256 verification, with no audio download", async () => {
  const stored = new Blob([BYTES], { type: "audio/mpeg" });
  const remote = api([get(ready())]);
  const states = [], lookups = [];
  const result = await remote.client.download(CANONICAL, {
    resumeJobId: JOB,
    onState: value => states.push(value),
    getStoredAudio: async meta => { lookups.push(meta); return stored; },
  });
  assert.deepEqual(lookups, [metadata]);
  assert.deepEqual(states, []);
  assert.equal(result.blob, stored);
  assert.equal(result.reused, true);
  remote.assertComplete();
});

test("missing, truncated, or corrupt local audio cannot suppress a real download", async t => {
  const corrupt = Uint8Array.from(BYTES);
  corrupt[corrupt.length - 1] ^= 1;
  for (const [name, stored] of [
    ["missing", null],
    ["truncated", new Blob([BYTES.subarray(1)])],
    ["same length, wrong hash", new Blob([corrupt])],
  ]) await t.test(name, async () => {
    assert.equal(await isStoredYouTubeAudio(metadata, stored), false);
    const remote = api([get(ready()), file()]);
    const result = await remote.client.download(CANONICAL, { resumeJobId: JOB, getStoredAudio: async () => stored });
    assert.equal(result.reused, false);
    assert.equal(await isStoredYouTubeAudio(metadata, result.blob), true);
    remote.assertComplete();
  });
});

test("ready metadata cannot redirect downloads, change videos, exceed the size cap, or fabricate a usable duration", async t => {
  for (const [name, changes] of [
    ["different video", { videoId: OTHER_VIDEO }],
    ["missing video", { videoId: undefined }],
    ["empty title", { title: "   " }],
    ["non-string title", { title: 12 }],
    ["oversized title", { title: "a".repeat(501) }],
    ["non-string artist", { artist: null }],
    ["oversized artist", { artist: "a".repeat(501) }],
    ["zero duration", { durationMs: 0 }],
    ["negative duration", { durationMs: -1 }],
    ["string duration", { durationMs: "54321" }],
    ["null duration", { durationMs: null }],
    ["missing duration", { durationMs: undefined }],
    ["empty file", { bytes: 0 }],
    ["negative bytes", { bytes: -1 }],
    ["fractional bytes", { bytes: 1.5 }],
    ["over 30 MB", { bytes: 30000001 }],
    ["invalid hash", { sha256: "g".repeat(64) }],
    ["truncated hash", { sha256: SHA.slice(1) }],
    ["uppercase hash", { sha256: SHA.toUpperCase() }],
    ["external file", { filePath: `https://other.example${AUDIO_PATH}` }],
    ["different job path", { filePath: `/api/jobs/${OTHER_JOB}/audio` }],
    ["query on file path", { filePath: `${AUDIO_PATH}?redirect=1` }],
    ["path traversal", { filePath: `${JOB_PATH}/../audio` }],
    ["missing file path", { filePath: undefined }],
  ]) await t.test(name, async () => {
    const remote = api([post(ready(changes))]);
    let lookups = 0;
    await assert.rejects(remote.client.download(CANONICAL, { getStoredAudio: async () => { lookups++; return null; } }), coded("INVALID_RESPONSE"));
    assert.equal(lookups, 0, "invalid metadata never reaches local storage lookup or audio fetch");
    remote.assertComplete();
  });
});

test("invalid API envelopes and job identities fail without fetching an audio URL", async t => {
  for (const [name, steps, resumeJobId] of [
    ["null JSON", [post(null)], null],
    ["array JSON", [post([])], null],
    ["string JSON", [post("ready")], null],
    ["missing ID", [post({ state: "ready" })], null],
    ["non-hex ID", [post(ready({ id: "x".repeat(32) }))], null],
    ["unknown state", [post({ id: JOB, state: "complete" })], null],
    ["poll changes ID", [post({ id: JOB, state: "queued" }), get(ready({ id: OTHER_JOB }))], null],
    ["resume returns another ID", [get(ready({ id: OTHER_JOB }))], JOB],
    ["HTML instead of JSON", [{ path: "/api/jobs", method: "POST", reply: () => new Response("<html>Unavailable</html>", { headers: { "Content-Type": "text/html" } }) }], null],
  ]) await t.test(name, async () => {
    const remote = api(steps);
    await assert.rejects(remote.client.download(CANONICAL, { resumeJobId }), coded("INVALID_RESPONSE"));
    remote.assertComplete();
  });
});

test("an incomplete, substituted, HTML, or partial audio response never returns a Blob", async t => {
  const corrupt = Uint8Array.from(BYTES);
  corrupt[corrupt.length - 1] ^= 1;
  for (const [name, reply] of [
    ["wrong SHA-256", () => audio(corrupt)],
    ["truncated body", () => audio(BYTES.subarray(1))],
    ["oversized body", () => audio(new Uint8Array([...BYTES, 0]))],
    ["HTML response", () => audio("<html>Not audio</html>", { "Content-Type": "text/html" })],
    ["wrong Content-Length", () => audio(BYTES, { "Content-Length": String(BYTES.byteLength - 1) })],
    ["invalid Content-Length", () => audio(BYTES, { "Content-Length": "unknown" })],
    ["partial response", () => audio(BYTES, {}, 206)],
  ]) await t.test(name, async () => {
    const remote = api([post(ready()), file(reply)]);
    await assert.rejects(remote.client.download(CANONICAL), coded("INVALID_AUDIO"));
    remote.assertComplete();
  });
});

test("chunked audio without Content-Length is verified after the complete stream arrives", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(BYTES.subarray(0, 3));
      controller.enqueue(BYTES.subarray(3, 10));
      controller.enqueue(BYTES.subarray(10));
      controller.close();
    },
  });
  const remote = api([post(ready()), file(() => audio(stream, { "Content-Type": "Audio/MPEG; charset=binary" }))]);
  const result = await remote.client.download(CANONICAL);
  assert.equal(await isStoredYouTubeAudio(metadata, result.blob), true);
  remote.assertComplete();
});

test("backend error strings become stable UI codes and expired jobs never start replacement downloads", async t => {
  for (const [name, steps, expected, resumeJobId] of [
    ["blocked source", [post({ id: JOB, state: "failed", error: "source_blocked" })], "SOURCE_BLOCKED", null],
    ["cancelled job", [post({ id: JOB, state: "cancelled" })], "CANCELLED", null],
    ["invalid URL", [{ path: "/api/jobs", method: "POST", reply: () => json({ error: "invalid_url" }, 400) }], "INVALID_URL", null],
    ["busy service", [{ path: "/api/jobs", method: "POST", reply: () => json({ error: "busy" }, 429) }], "BUSY", null],
    ["expired resume", [{ path: JOB_PATH, reply: () => json({}, 404) }], "JOB_NOT_FOUND", JOB],
    ["expired audio", [post(ready()), file(() => json({ error: "job_not_found" }, 404))], "JOB_NOT_FOUND", null],
    ["unsafe error text", [post({ id: JOB, state: "failed", error: "<script>not a code</script>" })], "DOWNLOAD_FAILED", null],
    ["connection failure", [{ path: "/api/jobs", method: "POST", reply: () => { throw new TypeError("Connection lost"); } }], "NETWORK_ERROR", null],
  ]) await t.test(name, async () => {
    const remote = api(steps);
    await assert.rejects(remote.client.download(CANONICAL, { resumeJobId }), coded(expected));
    remote.assertComplete();
  });
});

test("a signal cancelled before starting performs no remote requests", async () => {
  const controller = new AbortController();
  controller.abort();
  const remote = api([]);
  await assert.rejects(remote.client.download(CANONICAL, { signal: controller.signal }), coded("CANCELLED"));
  remote.assertComplete();
});

for (const stage of ["poll", "audio response"]) {
  test(`cancelling during ${stage} rejects a late response and deletes only the known job`, { timeout: 2500 }, async () => {
    const entered = deferred(), late = deferred();
    const waitForLateResponse = () => { entered.resolve(); return late.promise; };
    const steps = stage === "poll"
      ? [post({ id: JOB, state: "queued" }), { path: JOB_PATH, reply: waitForLateResponse }, deletion()]
      : [post(ready()), file(waitForLateResponse), deletion()];
    const remote = api(steps);
    const controller = new AbortController(), states = [];
    const pending = remote.client.download(CANONICAL, { signal: controller.signal, onState: state => states.push(state) });
    const rejected = assert.rejects(pending, coded("CANCELLED"));
    await entered.promise;
    controller.abort();
    late.resolve(stage === "poll" ? json(ready()) : audio());
    await rejected;
    assert.deepEqual(states, stage === "poll" ? ["queued"] : ["transferring"]);
    assert.equal(remote.requests[1].init.signal.aborted, true);
    remote.assertComplete();
  });
}

test("cancelling while reading a body prevents a complete but late stream from becoming saved audio", { timeout: 2500 }, async () => {
  const entered = deferred(), late = deferred();
  let delivered = false;
  const stream = new ReadableStream({
    async pull(controller) {
      if (delivered) return;
      delivered = true;
      entered.resolve();
      await late.promise;
      controller.enqueue(BYTES);
      controller.close();
    },
  }, { highWaterMark: 0 });
  const remote = api([post(ready()), file(() => audio(stream)), deletion()]);
  const controller = new AbortController();
  const pending = remote.client.download(CANONICAL, { signal: controller.signal });
  const rejected = assert.rejects(pending, coded("CANCELLED"));
  // Zero prefetch makes pull run only when the actual client reads the body.
  await entered.promise;
  controller.abort();
  late.resolve();
  await rejected;
  remote.assertComplete();
});

test("a stalled request hits the real operation deadline and cleans up the known job", async () => {
  const remote = api([
    post({ id: JOB, state: "queued" }),
    {
      path: JOB_PATH,
      reply: init => new Promise((resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
      }),
    },
    deletion(),
  ], { timeoutMs: 1000 });
  await assert.rejects(remote.client.download(CANONICAL), coded("TIMEOUT"));
  assert.equal(remote.requests[1].init.signal.aborted, true);
  remote.assertComplete();
});

test("explicit cancellation uses one DELETE and tolerates already-expired remote jobs", async () => {
  const remote = api([{ path: JOB_PATH, method: "DELETE", reply: () => json({ error: "job_not_found" }, 404) }]);
  await remote.client.cancel(JOB);
  remote.assertComplete();
});
