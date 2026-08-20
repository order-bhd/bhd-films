# BHD Films — Setup Guide (start to finish)

This is a complete, real, working project: a mobile-first customer app + a
full admin panel, backed by Supabase (auth, database, storage). Follow the
steps below in order. Every step tells you exactly what to click or run.

---

## 1. What you're getting — architecture in plain English

- **Frontend**: React + Vite (JavaScript), mobile-first, dark cinematic theme.
  Talks to Supabase directly using the public "anon" key (safe to expose).
- **Backend**: You don't run a separate server. All the sensitive logic
  (money, orders, approvals, rate changes) lives **inside Supabase**, as
  Postgres "RPC functions" — see `supabase/schema.sql`. The browser only
  ever calls these functions; it never calculates a price or touches a
  wallet balance directly. Postgres Row Level Security (RLS) makes sure
  a customer can only ever see/change their own data, and only admins can
  reach admin-only data.
- **Storage**: Payment receipt screenshots and the admin's QR code image
  are stored in Supabase Storage, with access rules attached.

Data flow, end to end:

```
Admin adds Category → Admin adds Services under it → Admin sets Rate/Bulk Pricing
        ↓
Customer opens category → picks service(s) + quantity + target link
        ↓
App shows a live price preview (quantity × current rate) — for display only
        ↓
Customer taps "Pay Now" → browser calls the place_order() database function
        ↓
place_order() RE-CALCULATES the price from the database (never trusts the browser),
validates quantity limits and the target link format, checks wallet balance,
deducts the wallet, and creates the order — all as ONE atomic transaction
        ↓
Order is saved with the HISTORICAL rate. If the admin changes the rate tomorrow,
this order's price never changes.
```

Funds flow:

```
Customer picks an amount → sees QR code → pays → uploads receipt
        ↓
create_fund_request() saves it as "Pending"
        ↓
Admin reviews the receipt in Admin → Fund Requests
        ↓
Admin clicks Approve / Reject / Request Re-upload
        ↓
admin_review_fund_request() credits the wallet (only on Approve), writes a
permanent wallet_transactions row, and logs an audit_logs entry — all atomic,
and it's impossible to approve the same request twice.
```

---

## 2. Folder structure

```
bhd-films/
├── supabase/
│   ├── schema.sql                       <- run this first (tables, security, functions)
│   ├── storage.sql                      <- run this second (file storage buckets)
│   ├── seed_admin.sql                   <- run this third (makes YOU the first admin)
│   ├── seed_sample_data.sql             <- optional: adds example categories/services
│   ├── migration_002_popular_services.sql   <- only if schema.sql already ran before this existed
│   ├── migration_003_push_notifications.sql <- only if schema.sql already ran before this existed
│   ├── migration_004_qr_per_amount.sql      <- only if schema.sql already ran before this existed
│   ├── migration_005_support_system.sql     <- only if schema.sql already ran before this existed
│   ├── cron_good_morning.sql            <- optional: daily automatic push (see step 10.8)
│   └── functions/
│       ├── send-push/index.ts           <- Edge Function that sends push notifications
│       └── send-support-email/index.ts  <- Edge Function that emails customers on Admin replies
├── public/
│   ├── manifest.webmanifest             <- makes the site installable ("Add to Home Screen")
│   ├── sw.js                            <- service worker: receives push, shows notifications
│   └── icons/                           <- app icons used by the manifest
├── src/
│   ├── components/
│   │   ├── common/        (Modal, Loader, AnimatedBackground, ProtectedRoute, InstallBanner...)
│   │   ├── navigation/    (BottomNav, TopHeader, AppLayout...)
│   │   ├── services/      (CategoryCard, ServiceCalculatorCard)
│   │   └── wallet/
│   ├── context/           (AuthContext, InstallPromptContext)
│   ├── hooks/              (useWallet, usePushNotifications)
│   ├── lib/supabase.js     (the ONE Supabase client)
│   ├── pages/
│   │   ├── customer/       (Home, Services, Wallet, Orders, Profile...)
│   │   └── admin/          (Dashboard, Categories, RateControl, FundRequests...)
│   ├── utils/               (validators, formatters, pricing preview, service worker registration)
│   ├── App.jsx              (all routes)
│   └── main.jsx
├── .env.example
├── package.json
└── SETUP.md                 (this file)
```

---

## 3. Install the tools you need on your own computer

This project was written and packaged in a cloud workspace that could not
reach the npm package registry, so the install step below has **not** been
run yet — you'll do it once, on your own machine.

1. Install [Node.js](https://nodejs.org) (version 18 or newer) if you don't
   have it. This gives you `node` and `npm`.
2. Unzip the project you downloaded, open a terminal, and go into the folder:
   ```bash
   cd bhd-films
   ```
3. Install the packages:
   ```bash
   npm install
   ```
   This reads `package.json` and downloads React, Vite, Supabase's client
   library, `lucide-react` (icons) and `framer-motion` (animations) into a
   new `node_modules` folder. It's normal for this to take 1-3 minutes.

---

## 4. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up / log in.
2. Click **New Project**. Pick an organization, name it "BHD Films", set a
   database password (save it somewhere), pick a region close to your
   users, and click **Create new project**. Wait ~2 minutes for it to spin up.
3. Once it's ready, on the left sidebar go to **Project Settings → API**.
   You'll need two values from this page in the next step:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

   Never copy the **service_role** key into this project — that key must
   stay out of any frontend code.

---

## 5. Set up your `.env` file

1. In the project folder, copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in a text editor and fill in the two values from Step 4:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Save the file. `.env` is already listed in `.gitignore` so it will never
   be committed to GitHub.

---

## 6. Set up Google Sign-In

**In Google Cloud Console:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com), create
   (or pick) a project.
2. Go to **APIs & Services → OAuth consent screen**. Choose "External",
   fill in the app name ("BHD Films"), your email, and save.
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**. Application type: **Web application**.
4. In Supabase, go to **Authentication → Providers → Google** to find the
   exact **Redirect URL** Supabase wants (it looks like
   `https://xxxxx.supabase.co/auth/v1/callback`). Copy it into Google's
   "Authorized redirect URIs" field, then click **Create** in Google.
5. Copy the **Client ID** and **Client Secret** Google gives you.

**Back in Supabase:**
1. Go to **Authentication → Providers → Google**, toggle it **on**, paste
   in the Client ID and Client Secret, and save.
2. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:5173` for now (you'll add your real
     domain here after deploying — see Step 13).
   - **Redirect URLs**: add `http://localhost:5173/*` (and later your
     production URL + `/*`).

---

## 7. Run the database schema

1. In Supabase, open the **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this project, copy the **entire file**,
   paste it into the SQL editor, and click **Run**. This creates every
   table, security rule (RLS), trigger, and secure function.
3. New query again → paste the entire `supabase/storage.sql` → **Run**.
   This creates the `receipts` (private) and `payment-qr` (public) storage
   buckets and their access rules.
4. (Optional but recommended) New query → paste the entire
   `supabase/seed_sample_data.sql` → **Run**. This adds a few real
   categories/services/rates (Instagram, Facebook, YouTube, TikTok) so the
   app isn't empty the first time you open it. You can edit or delete any
   of it later from the Admin Panel — nothing here is hard-coded in the
   frontend code.

---

## 8. Make yourself the first Super Admin

1. Run the app locally first (see Step 10 below) and sign in once with
   Google, using the account you want to be the admin. This creates your
   user + profile automatically.
2. Open `supabase/seed_admin.sql`, replace `'you@example.com'` with the
   exact email you just signed in with.
3. Paste it into the Supabase SQL Editor and click **Run**. The final
   `select` in that file should show your email with role `super_admin`.
4. Now go to `http://localhost:5173/admin/login` and sign in with Google
   again — you'll land on the Admin Dashboard.

---

## 9. About the storage bucket for receipts

`supabase/storage.sql` already creates and secures the `receipts` bucket
for you (private — customers can only see their own receipts, admins can
see all of them) and the `payment-qr` bucket (public, since it's just a
QR code image with no personal data). You don't need to create these by
hand in the dashboard.

---

## 10. Set up push notifications (optional, but recommended)

This gives you: a browser "Add to Home Screen" install prompt, and real
push notifications (offers, price changes, a daily "Good Morning") sent to
customers even when the site isn't open — through their phone's normal
notification tray, exactly like a native app, while still being a website.

**How it works:** a private VAPID key signs every push, and that key must
never reach the browser — so sending happens inside a Supabase Edge
Function (`supabase/functions/send-push`), never in the React app. The
app itself only ever holds the matching *public* key.

**10.1 Generate a VAPID keypair** (one-time, on your own computer):
```bash
npx web-push generate-vapid-keys
```
This prints a Public Key and a Private Key. Keep this terminal output
somewhere safe for the next two steps.

**10.2 Add the public key to your frontend:**
Open `.env` and add:
```
VITE_VAPID_PUBLIC_KEY=the-public-key-you-just-generated
```

**10.3 Install the Supabase CLI and link your project** (one-time):
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
```
Your project ref is the part before `.supabase.co` in your Project URL.

**10.4 Store the private key as a server-side secret** (never in `.env`,
never committed to GitHub):
```bash
supabase secrets set VAPID_PUBLIC_KEY=the-public-key
supabase secrets set VAPID_PRIVATE_KEY=the-private-key
supabase secrets set VAPID_SUBJECT=mailto:you@example.com
```

**10.5 Deploy the function:**
```bash
supabase functions deploy send-push
```

**10.6 Test it:**
1. Run the app, log in, go to **Profile → Enable Notifications**, and
   allow the browser's permission prompt.
2. As admin, go to **Admin → Offers**, and click **Notify Customers** on
   any active offer (or **Admin → Rate Control**, update a rate, then
   click the **Notify Customers of New Rate** button that appears).
3. You should get a real OS notification within a few seconds.

**10.7 About iOS (iPhone/iPad):** Apple only allows web push for a site
that has already been **added to the Home Screen** (Settings → Safari
16.4+) — a normal Safari tab can never receive push notifications, by
Apple's own restriction, no matter what any website does. This is exactly
why the app offers "Add to Home Screen" everywhere (banner, Profile,
drawer menu) — encourage iPhone users to install it first, then enable
notifications from inside the installed app icon.

**10.8 Optional: a daily automatic "Good Morning" push.** See
`supabase/cron_good_morning.sql` — it uses Postgres's `pg_cron` +
`pg_net` (enable both under Database → Extensions) to call your deployed
function on a schedule. Fully optional; skip it if you only want the
manual admin-triggered notifications.

---

## 11. Run the app

```bash
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Resize your
browser window down to ~390px wide (or open real dev tools device mode)
to see the mobile app experience it's designed for.

---

## 12. Checklist if something doesn't work

- **Blank page / console error about `import.meta.env`**: make sure `.env`
  exists (not just `.env.example`) and both variables are filled in, then
  restart `npm run dev`.
- **"Missing Supabase environment variables" in the console**: same as
  above — `.env` wasn't picked up. Vite only reads `.env` at startup.
- **Google sign-in redirects but you're not logged in**: double check the
  Redirect URL you pasted into Google Cloud Console *exactly* matches what
  Supabase's Google provider page shows, and that `http://localhost:5173/*`
  is in Supabase's Authentication → URL Configuration → Redirect URLs.
- **Categories/services show up empty**: you either skipped
  `seed_sample_data.sql` or haven't added any yet — go to
  `/admin/categories` and `/admin/services` once you're an admin.
- **"Not authorized" errors when saving things as admin**: confirm
  `seed_admin.sql` ran successfully and returned your row with
  `role = super_admin`. Also confirm you're signed in with that same
  Google account.
- **Receipts / QR image won't display**: confirm `storage.sql` ran
  without errors — check the **Storage** section in Supabase for the
  `receipts` and `payment-qr` buckets.
- **RLS / permission-denied errors on normal customer actions**: this
  usually means `schema.sql` didn't finish running (check the SQL editor's
  output for errors) — re-run it; every statement in it is safe to re-run
  except the very first `create table` calls, which will error if the
  tables already exist. If you need to start over, drop the tables first.
- **"Add to Home Screen" banner never shows**: Chrome only offers the
  install prompt over `https://` (or `localhost`) and only once basic PWA
  criteria are met - reload the deployed Vercel URL, not a plain `http://`
  preview. On iOS there is no automatic banner at all; the app shows manual
  Share → Add to Home Screen instructions instead, by Apple's design.
- **"Enable Notifications" does nothing / no permission popup**: push
  requires `https://` (or `localhost`) too, and requires
  `VITE_VAPID_PUBLIC_KEY` to be set in `.env`. On iPhone, the site must
  already be added to the Home Screen first — see step 10.7.
- **Notify Customers button says "Not authorized"**: you're not signed in
  as an admin in that browser tab, or the `send-push` function hasn't been
  deployed yet (step 10.5).
- **Notify Customers says "sent to 0 devices"**: no one has enabled
  notifications yet in that browser - go to Profile → Enable Notifications
  first, then try again.

---

## 13. Push this project to GitHub

```bash
git init
git add .
git commit -m "Initial commit - BHD Films"
```
Then create an empty repository on [github.com/new](https://github.com/new)
(don't initialize it with a README), and run the two commands GitHub shows
you, which look like:
```bash
git remote add origin https://github.com/YOUR-USERNAME/bhd-films.git
git branch -M main
git push -u origin main
```
`.env` will not be pushed (it's in `.gitignore`) — that's intentional.

---

## 14. Deploy for free on Vercel

1. Go to [vercel.com](https://vercel.com), sign up/log in with GitHub.
2. Click **Add New → Project**, pick your `bhd-films` GitHub repo.
3. Vercel auto-detects Vite. Before deploying, open **Environment
   Variables** and add the same values from your `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY` (only if you set up push notifications in Step 10)
4. Click **Deploy**. You'll get a URL like `https://bhd-films.vercel.app`.
   This is a real `https://` address, which is required for both "Add to
   Home Screen" and push notifications to work at all.
5. Go back to Supabase → **Authentication → URL Configuration** and:
   - Set **Site URL** to your new Vercel URL.
   - Add `https://bhd-films.vercel.app/*` to **Redirect URLs**.
6. In Google Cloud Console, add your Vercel URL's Supabase callback (same
   one from Step 6) — it doesn't change, so this is usually already fine.

No separate backend deployment is needed — the "backend" is entirely the
Supabase database functions you already set up in Step 7. That's the whole
point of using SECURITY DEFINER functions + RLS instead of a custom server.

---

## 15. What to try first

1. As a customer: open the site, browse a category, select a service,
   enter a quantity and a link, and watch the total calculate live.
2. As admin (`/admin/login`), go to Payment Settings and upload a QR code
   picture for at least one preset amount (e.g. ₹1) under "QR Code Per
   Amount" — each amount can have its own picture, or you can just set the
   "Default" one to start. Without this, customers see a blank QR box.
3. Sign in, go to Add Funds, pick the ₹1 Test amount, and go through the
   QR + upload-a-receipt flow (any image works for testing) — you should
   see the exact QR picture you uploaded for ₹1.
4. As admin, go to Fund Requests and Approve it — watch the customer's
   wallet update.
5. As the customer again, place a real order using that balance and check
   Order History.
6. As admin, change a service's rate in Rate Control, then look at the
   Home page "From ₹X" price update — and confirm the earlier order still
   shows its original historical rate.
7. If you set up Step 10: enable notifications from Profile, then click
   "Notify Customers" on an offer as admin — a real push should arrive.

That loop exercises every core piece of the system end to end.

---

## 16. Set up the Support & Ticket System

This adds a full two-way support system: the customer picks an issue
category, a smart form shows only the relevant fields, and everything
(customer name, email, mobile, related order/wallet transaction) is
attached automatically. When Admin replies, the customer gets a bell
notification on the website AND an email.

### 16.1 Run the database migration

1. Go to **supabase.com** → your project → **SQL Editor** → **New query**.
2. Open `supabase/migration_005_support_system.sql` from this project,
   copy its entire contents, paste into the SQL Editor, and click **Run**.
3. You should see "Success. No rows returned". Safe to re-run if you ever
   need to.

This also creates the `support-attachments` storage bucket automatically
— no separate storage step needed.

### 16.2 Create a free Resend account (for the reply email)

1. Go to **resend.com** and sign up (free tier: 3,000 emails/month).
2. Once logged in, go to **API Keys** → **Create API Key** → copy the key
   (starts with `re_`). You won't be able to see it again, so paste it
   somewhere safe for the next step.
3. (Optional, recommended once you're ready to go live) Under **Domains**,
   add and verify your own domain so emails come from
   `support@yourdomain.com` instead of Resend's shared test address. You
   can skip this at first — see the fallback note below.

### 16.3 Set the Edge Function secrets

In your terminal, inside the `bhd-films` folder:

```
npx supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```
```
npx supabase secrets set RESEND_FROM_EMAIL="BHD Films Support <onboarding@resend.dev>"
```
```
npx supabase secrets set SITE_URL=https://bhd-films.vercel.app
```

(If you verified your own domain in 16.2, replace the `RESEND_FROM_EMAIL`
value with `"BHD Films Support <support@yourdomain.com>"`.)

### 16.4 Deploy the email Edge Function

```
npx supabase functions deploy send-support-email
```

### 16.5 Push the code

```
git add -A
```
```
git commit -m "add support ticket system"
```
```
git push
```

### 16.6 Test it end to end

1. As a customer, go to **Support** → **New Support Ticket**, pick a
   category, fill the (short) form, and submit.
2. As admin, go to **Support Tickets**, open the new ticket — you should
   see the customer's name/email/mobile and any related order/wallet
   details automatically, with no searching required.
3. Type a reply and send it.
4. As the customer: the bell icon in the header should show a red badge
   within a second or two, and the ticket should show the reply. Check the
   customer's email inbox too (and spam folder, especially while using the
   shared `onboarding@resend.dev` test address).
