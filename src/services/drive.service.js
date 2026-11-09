import jwt from "jsonwebtoken"

/**
 * Google Drive, reached as a service account.
 *
 * Each gem's photos and videos live in a folder of its own inside one Shared Drive
 * (GOOGLE_DRIVE_ROOT_FOLDER_ID — the Shared Drive's id, or a folder inside it). A Shared
 * Drive rather than a personal one because a service account has no storage of its own:
 * files it creates there belong to the organisation, and stay put when people leave.
 *
 * Talks to the REST API with fetch rather than through googleapis, which would add a
 * very large dependency to every cold start for the handful of calls made here.
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3"
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const FOLDER_MIME = "application/vnd.google-apps.folder"

export const isDriveConfigured = () =>
  !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  )

let cachedToken = null

/** An access token for the service account, reused until a minute before it lapses. */
const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  // Env files hold the key on one line, with its newlines written as \n.
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
  const assertion = jwt.sign({ scope: "https://www.googleapis.com/auth/drive" }, privateKey, {
    algorithm: "RS256",
    issuer: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    audience: TOKEN_URL,
    expiresIn: "1h",
  })

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })
  if (!response.ok) throw new Error(`Google sign-in failed (${response.status}): ${await response.text()}`)

  const { access_token, expires_in } = await response.json()
  cachedToken = { value: access_token, expiresAt: Date.now() + expires_in * 1000 }
  return access_token
}

/** An authorised request to Drive. Returns the raw response; callers decide what a failure means. */
export const driveRequest = async (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${await getAccessToken()}`, ...(options.headers || {}) },
  })

/** A Drive API call that must succeed, answered as JSON. */
const driveJson = async (path, params = {}, options = {}) => {
  const query = new URLSearchParams({ supportsAllDrives: "true", ...params })
  const response = await driveRequest(`${DRIVE_API}${path}?${query}`, options)
  if (!response.ok) {
    const error = new Error(`Drive ${options.method || "GET"} ${path} failed (${response.status}): ${await response.text()}`)
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

export const driveFolderUrl = (folderId) => `https://drive.google.com/drive/folders/${folderId}`

export const createFolder = (name) =>
  driveJson("/files", { fields: "id" }, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID] }),
  })

export const getFile = (fileId, fields) => driveJson(`/files/${encodeURIComponent(fileId)}`, { fields })

/** Into Drive's trash, not gone: anyone with access to the Shared Drive can restore it for 30 days. */
export const trashFile = (fileId) =>
  driveJson(`/files/${encodeURIComponent(fileId)}`, { fields: "id" }, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  })

/** Everything in a folder that is not in the trash, newest first. */
export const listFolder = async (folderId) => {
  const files = []
  let pageToken
  do {
    const page = await driveJson("/files", {
      q: `'${folderId}' in parents and trashed = false`,
      corpora: "allDrives",
      includeItemsFromAllDrives: "true",
      orderBy: "createdTime desc",
      pageSize: "200",
      fields: "nextPageToken, files(id, name, mimeType, size, createdTime, thumbnailLink, videoMediaMetadata(durationMillis))",
      ...(pageToken ? { pageToken } : {}),
    })
    files.push(...page.files)
    pageToken = page.nextPageToken
  } while (pageToken)
  return files
}

/**
 * Opens a resumable upload into a folder and returns the session address.
 *
 * The browser sends the file's bytes to that address itself, so a video of any size
 * goes straight to Google instead of being held in this server's memory on the way.
 * The address is the authorisation — it uploads one file, to this folder, and nothing
 * else. Google only accepts the browser's requests to it from the origin named here.
 */
export const createUploadSession = async ({ folderId, name, mimeType, size, origin }) => {
  const response = await driveRequest(`${DRIVE_UPLOAD_API}/files?uploadType=resumable&supportsAllDrives=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType,
      ...(size ? { "X-Upload-Content-Length": String(size) } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify({ name, parents: [folderId] }),
  })
  const location = response.headers.get("location")
  if (!response.ok || !location) {
    throw new Error(`Drive upload session failed (${response.status}): ${await response.text()}`)
  }
  return location
}

/** One byte range of a file's contents. Returns the raw response, 206 when Drive served it. */
export const fetchFileRange = (fileId, range) =>
  driveRequest(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
    headers: { Range: range },
  })
