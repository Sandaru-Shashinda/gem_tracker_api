/**
 * The file id inside a Google Drive share link, or null when it is not one.
 *
 * Mirrors driveFileId in the app's video-link.ts: ".../file/d/<id>/view" is what Drive's
 * "Copy link" gives; open?id= and uc?id= are older forms.
 */
export const driveFileId = (value) => {
  let url
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (!/(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/.test(url.hostname)) return null

  const fromPath = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1]
  return fromPath || url.searchParams.get("id")
}

/** Where a publicly shared Drive file's bytes can be fetched from, server to server. */
export const driveDownloadUrl = (fileId) =>
  `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`
