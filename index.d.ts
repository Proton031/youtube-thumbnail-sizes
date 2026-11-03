export type ThumbnailQuality = "maxresdefault" | "sddefault" | "hqdefault" | "mqdefault" | "default";
export interface ThumbnailSize { quality: ThumbnailQuality; label: string; width: number; height: number }
export interface ThumbnailCandidate extends ThumbnailSize { url: string }
export interface FoundThumbnail { quality: ThumbnailQuality; label: string; url: string; width: number; height: number; bytes: number }
export declare const THUMBNAIL_SIZES: readonly ThumbnailSize[];
export declare function getVideoId(input: string): string | null;
export declare function thumbnailUrls(videoId: string): ThumbnailCandidate[];
export declare function jpegDimensions(bytes: Uint8Array | ArrayBuffer): { width: number; height: number } | null;
export declare function isGenuineThumbnail(quality: ThumbnailQuality, width: number, height: number): boolean;
export declare function findThumbnails(
  urlOrId: string,
  options?: { fetch?: typeof fetch; maxBytes?: number; timeoutMs?: number },
): Promise<{ videoId: string; thumbnails: FoundThumbnail[] }>;
