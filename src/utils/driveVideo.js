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

// Each answer carries at most this much of the video. Kept well under Vercel's 4.5 MB
// response limit; the player simply asks for the next piece.
const VIDEO_CHUNK_BYTES = 3 * 1024 * 1024

/**
 * The Range to ask Drive for, given the one the player sent.
 *
 * Players ask for "bytes=start-", "bytes=start-end" or "bytes=-suffix". Every answer is
 * capped at one chunk; a shorter 206 than was asked for is valid and the player asks
 * again from where it ends.
 */
export const chunkedRange = (header) => {
  const [, startText = "", endText = ""] = /^bytes=(\d*)-(\d*)$/.exec(header || "") || []
  if (!startText && endText) return `bytes=-${Math.min(Number(endText), VIDEO_CHUNK_BYTES)}`
  const start = Number(startText) || 0
  const lastByte = start + VIDEO_CHUNK_BYTES - 1
  return `bytes=${start}-${endText ? Math.min(Number(endText), lastByte) : lastByte}`
}

/**
 * Hands Drive's answer to a range request on to the player.
 *
 * Anything but a byte range means Drive refused the file (not shared, downloads
 * disabled, quota) and sent a page explaining so — not something to play.
 */
export const relayRange = async (res, upstream, cacheControl) => {
  if (upstream.status === 416) {
    return res.status(416).set("Content-Range", upstream.headers.get("content-range") || "").end()
  }
  if (upstream.status !== 206) {
    return res.status(502).json({ message: "Drive did not serve the video" })
  }

  const body = Buffer.from(await upstream.arrayBuffer())
  res.status(206).set({
    "Content-Type": upstream.headers.get("content-type") || "video/mp4",
    "Content-Range": upstream.headers.get("content-range"),
    "Content-Length": String(body.length),
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
  })
  res.end(body)
}
