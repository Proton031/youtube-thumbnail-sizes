// youtube-thumbnail-sizes — find which YouTube thumbnail sizes really exist.
// MIT License. Extracted from the SaveMingo YouTube Thumbnail Downloader:
// https://savemingo.com/youtube-thumbnail-downloader

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Thumbnail names YouTube publishes, largest first, with their minimum real dimensions. */
export const THUMBNAIL_SIZES = Object.freeze([
  { quality: "maxresdefault", label: "Maximum resolution", width: 1280, height: 720 },
  { quality: "sddefault", label: "Standard definition", width: 640, height: 480 },
  { quality: "hqdefault", label: "High quality", width: 480, height: 360 },
  { quality: "mqdefault", label: "Medium quality", width: 320, height: 180 },
  { quality: "default", label: "Default thumbnail", width: 120, height: 90 },
]);

/**
 * Extract the 11-character video ID from a YouTube URL (watch, youtu.be,
 * Shorts, live, embed, youtube-nocookie) or return a bare ID. Returns null
 * for anything else.
 */
export function getVideoId(input) {
  const value = String(input ?? "").trim();
  if (VIDEO_ID.test(value)) return value;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  let id = null;
  if (host === "youtu.be") id = parts[0] ?? null;
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (["shorts", "embed", "live"].includes(parts[0])) id = parts[1] ?? null;
  }
  if (host === "youtube-nocookie.com" && parts[0] === "embed") id = parts[1] ?? null;
  return id && VIDEO_ID.test(id) ? id : null;
}

/** Candidate thumbnail URLs for a video ID (they may not all exist). */
export function thumbnailUrls(videoId) {
  if (!VIDEO_ID.test(String(videoId))) throw new TypeError("Invalid YouTube video ID");
  return THUMBNAIL_SIZES.map((size) => ({
    ...size,
    url: `https://i.ytimg.com/vi/${videoId}/${size.quality}.jpg`,
  }));
}

/** Read width/height from JPEG bytes (baseline or progressive). Returns null if not a valid JPEG. */
export function jpegDimensions(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  for (let offset = 2; offset + 9 < b.length; ) {
    if (b[offset] !== 0xff) return null;
    while (b[offset] === 0xff) offset += 1;
    const marker = b[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (offset + 1 >= b.length) return null;
    const length = (b[offset] << 8) + b[offset + 1];
    if (length < 2 || offset + length > b.length) return null;
    if (SOF.has(marker)) {
      if (length < 7) return null;
      return { height: (b[offset + 3] << 8) + b[offset + 4], width: (b[offset + 5] << 8) + b[offset + 6] };
    }
    offset += length;
  }
  return null;
}

/**
 * True when a JPEG of the given size is a genuine image for that quality.
 * YouTube answers a missing size with a 120x90 grey placeholder, so a
 * "maxresdefault" that is only 120x90 is not really available.
 */
export function isGenuineThumbnail(quality, width, height) {
  const size = THUMBNAIL_SIZES.find((s) => s.quality === quality);
  return Boolean(size) && width >= size.width && height >= size.height;
}

/**
 * Fetch each candidate and return only the sizes that really exist, with
 * their measured dimensions. Server-side use (Node 18+, Deno, Bun, Workers):
 * browsers block reading i.ytimg.com responses cross-origin.
 */
export async function findThumbnails(urlOrId, { fetch: fetchImpl = globalThis.fetch, maxBytes = 5_000_000, timeoutMs = 10_000 } = {}) {
  const id = getVideoId(urlOrId);
  if (!id) throw new TypeError("Not a YouTube video URL or ID");
  const results = await Promise.all(
    thumbnailUrls(id).map(async (candidate) => {
      try {
        const res = await fetchImpl(candidate.url, { signal: AbortSignal.timeout(timeoutMs) });
        const type = (res.headers.get("content-type") || "").toLowerCase();
        if (!res.ok || !type.startsWith("image/jpeg")) return null;
        const buffer = new Uint8Array(await res.arrayBuffer());
        if (buffer.byteLength > maxBytes) return null;
        const dims = jpegDimensions(buffer);
        if (!dims || !isGenuineThumbnail(candidate.quality, dims.width, dims.height)) return null;
        return { quality: candidate.quality, label: candidate.label, url: candidate.url, width: dims.width, height: dims.height, bytes: buffer.byteLength };
      } catch {
        return null;
      }
    }),
  );
  return { videoId: id, thumbnails: results.filter(Boolean) };
}
