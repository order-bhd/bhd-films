// BHD Films — send-support-email Edge Function
//
// Sends the customer an email whenever Admin replies to their support
// ticket. Uses Resend (https://resend.com) - a free-tier email API that
// needs only one secret (RESEND_API_KEY), no SMTP server to run.
//
// Who is allowed to call this: a logged-in BHD Films admin with
// manage_support permission, right after send_support_reply() succeeds
// (same "reply -> then notify" pattern as NotifyCustomersButton / send-push).
// The function itself re-fetches the ticket + customer email using the
// service-role key - it never trusts a recipient address from the caller.
//
// Deploy with:  supabase functions deploy send-support-email
// Secrets needed (supabase secrets set ...): RESEND_API_KEY,
// RESEND_FROM_EMAIL (e.g. "BHD Films Support <support@yourdomain.com>",
// or "BHD Films Support <onboarding@resend.dev>" while testing).
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are
// provided automatically by the platform.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'BHD Films Support <onboarding@resend.dev>'
const SITE_URL = Deno.env.get('SITE_URL') || 'https://bhd-films.vercel.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error('Server is missing required Supabase secrets.')
    }
    if (!RESEND_API_KEY) {
      throw new Error('Server is missing RESEND_API_KEY. See SETUP.md.')
    }

    const authHeader = req.headers.get('Authorization') || ''

    // Must be a logged-in admin with support permission. Verify with
    // THEIR token (RLS-respecting client), never trust the frontend.
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData?.user) {
      return json({ error: 'Not authenticated.' }, 401)
    }
    const { data: adminRow } = await callerClient.from('admin_users').select('role, permissions').eq('id', userData.user.id).maybeSingle()
    const isSupportAllowed =
      adminRow?.role === 'super_admin' ||
      adminRow?.role === 'admin' ||
      (adminRow?.role === 'staff' && adminRow?.permissions?.manage_support === true)
    if (!isSupportAllowed) {
      return json({ error: 'Not authorized.' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const ticketId = body.ticketId
    const replyPreview = String(body.replyPreview || '').slice(0, 500)
    if (!ticketId) {
      return json({ error: 'ticketId is required.' }, 400)
    }

    // Service-role client - looks up the real ticket + customer email.
    // Never trust an email address passed in from the browser.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: ticket, error: ticketError } = await adminClient
      .from('support_tickets')
      .select('id, ticket_code, subject, user_id')
      .eq('id', ticketId)
      .maybeSingle()
    if (ticketError) throw ticketError
    if (!ticket) return json({ error: 'Ticket not found.' }, 404)

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, full_name, username')
      .eq('id', ticket.user_id)
      .maybeSingle()
    if (profileError) throw profileError
    if (!profile?.email) {
      return json({ error: 'Customer has no email on file - email not sent.' }, 200)
    }

    const customerName = profile.full_name || profile.username || 'there'
    const ticketUrl = `${SITE_URL}/support/${ticket.id}`
    const html = renderEmailHtml({
      customerName,
      ticketCode: ticket.ticket_code,
      subject: ticket.subject,
      replyPreview,
      ticketUrl
    })

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [profile.email],
        subject: `New Reply to Your Support Request (${ticket.ticket_code})`,
        html
      })
    })

    if (!resendResp.ok) {
      const errText = await resendResp.text().catch(() => '')
      throw new Error(`Resend API error (${resendResp.status}): ${errText}`)
    }

    return json({ status: 'sent' })
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error.' }, 500)
  }
})

function renderEmailHtml({ customerName, ticketCode, subject, replyPreview, ticketUrl }) {
  const escape = (s) => String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#0c0a10; padding:32px 16px; color:#e8e4f0;">
    <div style="max-width:480px; margin:0 auto; background:#15121c; border-radius:16px; padding:28px; border:1px solid #2a2433;">
      <p style="margin:0 0 4px; font-size:12px; letter-spacing:1px; color:#d4af37; text-transform:uppercase;">BHD Films Support</p>
      <h1 style="margin:0 0 18px; font-size:19px; color:#fff;">New Reply to Your Support Request</h1>
      <p style="margin:0 0 14px; font-size:14px; line-height:1.6; color:#c9c4d4;">Hello ${escape(customerName)},</p>
      <p style="margin:0 0 14px; font-size:14px; line-height:1.6; color:#c9c4d4;">Our Support Team has replied to your support request.</p>
      <table style="width:100%; font-size:13px; color:#c9c4d4; margin-bottom:14px;">
        <tr><td style="padding:4px 0; color:#8b8494;">Ticket ID</td><td style="padding:4px 0; text-align:right; font-weight:700; color:#fff;">${escape(ticketCode)}</td></tr>
        <tr><td style="padding:4px 0; color:#8b8494;">Issue</td><td style="padding:4px 0; text-align:right; font-weight:700; color:#fff;">${escape(subject)}</td></tr>
      </table>
      ${replyPreview ? `<div style="background:#1e1927; border-radius:10px; padding:12px 14px; font-size:13px; color:#c9c4d4; margin-bottom:18px; border-left:3px solid #d4af37;">${escape(replyPreview)}</div>` : ''}
      <a href="${ticketUrl}" style="display:inline-block; background:linear-gradient(135deg,#d4af37,#ffe080); color:#211607; font-weight:700; font-size:14px; padding:12px 22px; border-radius:12px; text-decoration:none;">View Support Ticket</a>
      <p style="margin:22px 0 0; font-size:12px; color:#8b8494;">Please log in to your account to view the complete response.</p>
      <p style="margin:18px 0 0; font-size:12px; color:#8b8494;">Thank you,<br/>BHD Films Support Team</p>
    </div>
  </div>`
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}
