import { getAttachmentAccess } from "@/services/healthRecords";

type CachedAttachmentUrl = {
  url: string;
  expiresAt: number;
};

const urlCache = new Map<string, CachedAttachmentUrl>();

// Changes whenever the cache is cleared. Requests started before
// a clear must not repopulate the cache afterward.
let cacheGeneration = 0;

export function clearAttachmentAccessCache(): void {
  cacheGeneration += 1;
  urlCache.clear();
}

export async function resolveAttachmentAccessUrl(
  recordId: string,
  attachmentId: string,
): Promise<string> {
  const key = `${recordId}:${attachmentId}`;
  const requestGeneration = cacheGeneration;

  const cached = urlCache.get(key);

  // Reuse a URL only when it has more than 30 seconds remaining.
  if (cached && cached.expiresAt - Date.now() > 30_000) {
    return cached.url;
  }

  const { url, expiresAt } = await getAttachmentAccess(
    recordId,
    attachmentId,
  );

  // Locking or logging out may have cleared the cache while
  // the access request was in flight.
  if (requestGeneration !== cacheGeneration) {
    throw new Error("ATTACHMENT_ACCESS_CACHE_CLEARED");
  }

  if (!url) {
    throw new Error("No access URL returned.");
  }

  const expiryTime = new Date(expiresAt).getTime();

  if (!Number.isFinite(expiryTime) || expiryTime <= Date.now()) {
    throw new Error("The attachment access URL has expired.");
  }

  urlCache.set(key, {
    url,
    expiresAt: expiryTime,
  });

  return url;
}