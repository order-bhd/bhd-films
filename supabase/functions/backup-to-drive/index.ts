// BHD Films — backup-to-drive Edge Function
//
// Called automatically (via a database trigger on storage.objects, see
// supabase/migration_009_drive_backup.sql) every time a new file is
// uploaded to one of the app's private storage buckets: receipts,
// support-attachments, refund-receipts, payment-qr.
//
// It downloads that one file from Supabase Storage and re-uploads a
// copy of it into a Google Drive folder you own, using a Google OAuth
// refresh token (see supabase/functions/_shared/googleDrive.ts for why
// a plain service account can't be used for a personal Gmail Drive).
//
// Deploy with:  supabase functions deploy backup-to-drive
// Secrets needed: GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET,
// GDRIVE_REFRESH_TOKEN, GDRIVE_FOLDER_ID. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { checkGoogleDriveSecrets, getGoogleAccessToken, uploadBytesToDrive } from '../_shared/googleDrive.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const GDRIVE_FOLDER_ID = Deno.env.get('GDRIVE_FOLDER_ID')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Server is missing required Supabase secrets.')
    }
    checkGoogleDriveSecrets()

    // Only the database trigger (using the service-role key) is allowed
    // to call this - it's never exposed to customers or the frontend.
    const authHeader = req.headers.get('Authorization') || ''
    if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
      return json({ error: 'Not authorized.' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const bucket = String(body.bucket || '')
    const path = String(body.path || '')
    if (!bucket || !path) {
      return json({ error: 'bucket and path are required.' }, 400)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: fileBlob, error: dlError } = await adminClient.storage.from(bucket).download(path)
    if (dlError || !fileBlob) {
      throw new Error(dlError?.message || 'Could not download the file from storage.')
    }

    const accessToken = await getGoogleAccessToken()
    const driveFileName = `[${bucket}] ${path.replace(/\//g, '_')}`
    const bytes = new Uint8Array(await fileBlob.arrayBuffer())

    const driveFileId = await uploadBytesToDrive(accessToken, driveFileName, fileBlob.type || 'application/octet-stream', bytes, GDRIVE_FOLDER_ID ?? '')

    return json({ status: 'ok', driveFileId })
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error.' }, 500)
  }
})

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}
