# youtube-thumbnail-sizes

Get YouTube thumbnail URLs from any video link, and find out **which sizes really exist**.

YouTube publishes up to five thumbnails per video (`maxresdefault`, `sddefault`, `hqdefault`, `mqdefault`, `default`). When a size is missing, YouTube doesn't return a 404. It returns a 120×90 grey placeholder with HTTP 200. So `maxresdefault.jpg` "works" for every video, even ones that have no HD thumbnail.

This package reads the real JPEG dimensions and keeps only genuine sizes. It has zero dependencies, ships TypeScript types, and works with Node 18+, Deno, Bun and Cloudflare Workers.

> Just need a thumbnail? Use the free web tool: **[SaveMingo YouTube Thumbnail Downloader](https://savemingo.com/youtube-thumbnail-downloader)**. This package is the logic behind it.

## Install

```bash
npm install youtube-thumbnail-sizes
```

## Usage

```js
import { getVideoId, thumbnailUrls, findThumbnails } from "youtube-thumbnail-sizes";

getVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc"); // "dQw4w9WgXcQ"
getVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"); // "dQw4w9WgXcQ"

thumbnailUrls("dQw4w9WgXcQ")[0].url;
// "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" (a candidate; may not exist)

const { thumbnails } = await findThumbnails("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
// [{ quality: "maxresdefault", width: 1280, height: 720, url: "...", bytes: ... }, ...]
// Only sizes whose real JPEG dimensions match are returned.
```

### Supported links

`youtube.com/watch?v=`, `m.youtube.com`, `music.youtube.com`, `youtu.be/`, `/shorts/`, `/live/`, `/embed/`, `youtube-nocookie.com/embed/`, or a bare 11-character ID.

## API

| Function | Returns |
|---|---|
| `getVideoId(input)` | The 11-character ID, or `null` |
| `thumbnailUrls(id)` | All 5 candidate URLs with minimum sizes, largest first |
| `findThumbnails(urlOrId, { fetch?, maxBytes?, timeoutMs? })` | `{ videoId, thumbnails }` with only the sizes that really exist |
| `jpegDimensions(bytes)` | `{ width, height }` read from the JPEG header, or `null` |
| `isGenuineThumbnail(quality, w, h)` | `false` for a placeholder posing as a bigger size |
| `THUMBNAIL_SIZES` | The 5 sizes and their minimum dimensions |

| Size | Minimum dimensions |
|---|---|
| `maxresdefault` | 1280 × 720 |
| `sddefault` | 640 × 480 |
| `hqdefault` | 480 × 360 |
| `mqdefault` | 320 × 180 |
| `default` | 120 × 90 |

## Notes

- `findThumbnails` must run **server-side**, because browsers can't read `i.ytimg.com` image bytes cross-origin.
- It only reads public thumbnail images. It does not download videos or use the YouTube API, and needs no API key.
- Thumbnails belong to their creators. Use them for reference, commentary or with permission, and follow YouTube's terms.

## License

MIT © [SaveMingo](https://savemingo.com)
