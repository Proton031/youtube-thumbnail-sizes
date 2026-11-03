import { test } from "node:test";
import assert from "node:assert/strict";
import { getVideoId, thumbnailUrls, jpegDimensions, isGenuineThumbnail, findThumbnails, THUMBNAIL_SIZES } from "../index.js";

const ID = "dQw4w9WgXcQ";

test("getVideoId handles every public URL form", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    ` ${ID} `,
  ]) assert.equal(getVideoId(url), ID, url);
});

test("getVideoId rejects non-YouTube and malformed input", () => {
  for (const bad of ["", "not a url", "https://example.com/watch?v=" + ID, "https://youtube.com/watch?v=short", "https://youtube.com/channel/UC123", null])
    assert.equal(getVideoId(bad), null, String(bad));
});

test("thumbnailUrls lists sizes largest first on i.ytimg.com", () => {
  const urls = thumbnailUrls(ID);
  assert.equal(urls.length, 5);
  assert.equal(urls[0].url, `https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`);
  assert.throws(() => thumbnailUrls("../etc/passwd"));
});

function jpeg(width, height) {
  // SOI, SOF0 segment (length 17), EOI
  return new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9]);
}

test("jpegDimensions reads SOF dimensions and rejects non-JPEG", () => {
  assert.deepEqual(jpegDimensions(jpeg(1280, 720)), { width: 1280, height: 720 });
  assert.equal(jpegDimensions(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null);
});

test("isGenuineThumbnail rejects the 120x90 placeholder for larger sizes", () => {
  assert.equal(isGenuineThumbnail("maxresdefault", 120, 90), false);
  assert.equal(isGenuineThumbnail("maxresdefault", 1280, 720), true);
  assert.equal(isGenuineThumbnail("default", 120, 90), true);
  assert.equal(THUMBNAIL_SIZES.length, 5);
});

test("findThumbnails keeps only genuine sizes (mocked fetch)", async () => {
  const sizes = { maxresdefault: [120, 90], sddefault: [640, 480], hqdefault: [480, 360], mqdefault: [320, 180], default: [120, 90] };
  const fakeFetch = async (url) => {
    const q = url.split("/").pop().replace(".jpg", "");
    const [w, h] = sizes[q];
    return new Response(jpeg(w, h), { headers: { "content-type": "image/jpeg" } });
  };
  const { videoId, thumbnails } = await findThumbnails(`https://youtu.be/${ID}`, { fetch: fakeFetch });
  assert.equal(videoId, ID);
  assert.deepEqual(thumbnails.map((t) => t.quality), ["sddefault", "hqdefault", "mqdefault", "default"]);
});
