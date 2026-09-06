/** URL for a file stored under DATA_DIR/files. */
export function fileUrl(relativePath: string): string {
  return `/api/files/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * Picture for a set: a locally stored upload wins over an external URL, since
 * it keeps working when the shop takes its image offline.
 */
export function setImageSrc(input: {
  imagePath?: string | null;
  imageUrl?: string | null;
}): string | null {
  if (input.imagePath) return fileUrl(input.imagePath);
  return input.imageUrl ?? null;
}
