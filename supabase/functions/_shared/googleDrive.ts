// BHD Films — shared Google Drive helper.
//
// Used by both backup-to-drive (single-file backups, triggered on every
// upload) and backup-database (daily full data export). Neither
// function talks to Google directly - they both go through here.
//
// Needs these secrets set once (supabase secrets set ...):
//   GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN,
//   GDRIVE_FOLDER_ID

const GDRIVE_CLIENT_ID = Deno.env.get('GDRIVE_CLIENT_ID')
const GDRIVE_CLIENT_SECRET = Deno.env.get('GDRIVE_CLIENT_SECRET')
const GDRIVE_REFRESH_TOKEN = Deno.env.get('GDRIVE_REFRESH_TOKEN')

export function checkGoogleDriveSecrets() {
  if (!GDRIVE_CLIENT_ID || !GDRIVE_CLIENT_SECRET || !GDRIVE_REFRESH_TOKEN || !Deno.env.get('GDRIVE_FOLDER_ID')) {
    throw new Error('Server is missing Google Drive secrets. See SETUP.md.')
  }
}

export async function getGoogleAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GDRIVE_CLIENT_ID ?? '',
      client_secret: GDRIVE_CLIENT_SECRET ?? '',
      refresh_token: GDRIVE_REFRESH_TOKEN ?? '',
      grant_type: 'refresh_token'
    })
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Could not get a Google access token.')
  }
  return data.access_token as string
}

// Uploads raw bytes as a file into a Drive folder. Returns the new
// file's Drive id.
export async function uploadBytesToDrive(accessToken: string, fileName: string, mimeType: string, bytes: Uint8Array, folderId: string) {
  const metadata = { name: fileName, parents: [folderId] }
  const boundary = 'bhdfilms-' + Date.now()
  const encoder = new TextEncoder()

  const metadataPart = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  )
  const closingPart = encoder.encode(`\r\n--${boundary}--`)

  const multipartBody = new Uint8Array(metadataPart.length + bytes.length + closingPart.length)
  multipartBody.set(metadataPart, 0)
  multipartBody.set(bytes, metadataPart.length)
  multipartBody.set(closingPart, metadataPart.length + bytes.length)

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  })
  const uploadJson = await uploadRes.json()
  if (!uploadRes.ok) {
    throw new Error(uploadJson.error?.message || 'Google Drive upload failed.')
  }
  return uploadJson.id as string
}

// Turns an array of plain row objects into a CSV string. Handles
// commas/quotes/newlines inside values safely.
export function rowsToCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const lines = [columns.join(',')]
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(','))
  }
  return lines.join('\n')
}
