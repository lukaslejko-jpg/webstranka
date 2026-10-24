// Licensed, complete recordings for an explicit offline test download.
// Audio is intentionally excluded from the service-worker shell.
export const SAMPLE_TRACKS = [
  {
    "id": "sample-bach-08-v1",
    "path": "./samples/bach-invention-08.mp3",
    "title": "Bach – Invention No. 8",
    "artist": "Michael Bednarek · MIDI / piano",
    "duration": 61806,
    "bytes": 618924,
    "sha256": "56c02c159baf0a5bb3803a4633a71c96bcd3a8eb8f8095447e11aaa33ada8c61"
  },
  {
    "id": "sample-bach-10-v1",
    "path": "./samples/bach-invention-10.mp3",
    "title": "Bach – Invention No. 10",
    "artist": "Jason M. C., Han",
    "duration": 70740,
    "bytes": 708214,
    "sha256": "0afd0b8b45a1f6dc033a2d0e700fde6232cfe2cf9f4a49cf25f3ae20977795bb"
  },
  {
    "id": "sample-bach-14-v1",
    "path": "./samples/bach-invention-14.mp3",
    "title": "Bach – Invention No. 14",
    "artist": "Jason M. C., Han",
    "duration": 112405,
    "bytes": 1124851,
    "sha256": "2b929e36e185498f8cd67325564ef4d13fcf5c66d9bf03064cc9d19d290c9ab9"
  }
];

export function isStoredSample(track, blob) {
  return blob?.size === track.bytes && typeof blob.arrayBuffer === "function";
}

export async function downloadSample(track) {
  if (!SAMPLE_TRACKS.includes(track)) throw new TypeError("Unknown sample track");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(new URL(track.path, import.meta.url), {
      signal: controller.signal, credentials: "omit", redirect: "error", cache: "no-cache",
    });
    const type = (response.headers.get("content-type") || "").split(";")[0].trim();
    if (response.status !== 200 || (!type.startsWith("audio/") && type !== "application/octet-stream"))
      throw new Error("Audio download unavailable");
    const length = response.headers.get("content-length");
    if (length && Number(length) !== track.bytes) throw new Error("Incomplete audio download");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== track.bytes) throw new Error("Incomplete audio download");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
    if (sha !== track.sha256) throw new Error("Audio integrity check failed");
    return new Blob([bytes], { type: "audio/mpeg" });
  } finally {
    clearTimeout(timeout);
  }
}
