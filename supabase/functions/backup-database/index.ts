// BHD Films — backup-database Edge Function
//
// Runs once a day (via a pg_cron schedule, see
// supabase/cron_database_backup.sql) and exports every important table
// - customers, orders, wallet transactions, coupons, refunds, support
// tickets, etc. - as CSV files, uploaded straight into your Google
// Drive backup folder. Each file is named with today's date so you get
// one dated snapshot per day, e.g. "2026-08-20_orders.csv".
//
// Deploy with:  supabase functions deploy backup-database
// Uses the same 4 Google Drive secrets as backup-to-drive.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { checkGoogleDriveSecrets, getGoogleAccessToken, uploadBytesToDrive, rowsToCsv } from '../_shared/googleDrive.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const GDRIVE_FOLDER_ID = Deno.env.get('GDRIVE_FOLDER_ID')

// Every table backed up daily. Add/remove table names here any time -
// nothing else needs to change.
const TABLES = [
  'profiles',
  'admin_users',
  'categories',
  'services',
  'orders',
  'order_items',
  'wallets',
  'wallet_transactions',
  'fund_requests',
  'refund_requests',
  'coupons',
  'coupon_redemptions',
  'offers',
  'support_tickets',
  'support_messages',
  'audit_logs'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Server is missing required Supabase secrets.')
    }
    checkGoogleDriveSecrets()

    const authHeader = req.headers.get('Authorization') || ''
    if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
      return json({ error: 'Not authorized.' }, 401)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const accessToken = await getGoogleAccessToken()
    const today = new Date().toISOString().slice(0, 10)

    const results: Record<string, string> = {}

    for (const table of TABLES) {
      const { data, error } = await adminClient.from(table).select('*')
      if (error) {
        results[table] = `skipped: ${error.message}`
        continue
      }
      const csv = rowsToCsv(data || [])
      const bytes = new TextEncoder().encode(csv)
      const fileName = `${today}_${table}.csv`
      try {
        const driveFileId = await uploadBytesToDrive(accessToken, fileName, 'text/csv', bytes, GDRIVE_FOLDER_ID ?? '')
        results[table] = `ok (${(data || []).length} rows) -> ${driveFileId}`
      } catch (uploadErr) {
        results[table] = `upload failed: ${uploadErr?.message || uploadErr}`
      }
    }

    return json({ status: 'ok', date: today, results })
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
