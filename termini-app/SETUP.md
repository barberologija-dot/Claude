# Setup guide (Stage 1)

This puts the booking app online at `termini.barberologija.si`, using only free plans.
You need about 45 minutes and three free accounts: **Supabase**, **Cloudflare** and **Brevo**.

Rules for keys and passwords:
- Never paste a password or secret key into a chat, an email or the code.
- Each step below says exactly which dashboard field a key goes into.
- Menu names in these dashboards change now and then. If a screen looks different, send a screenshot (without keys visible) and ask.

---

## Part 1: Supabase (database and logins)

1. Go to **supabase.com**, create an account, and click **New project**.
   - Name: `termini`
   - Region: **Central EU (Frankfurt)**. This keeps the data in the EU.
   - Database password: let it generate one and save it in your password manager. The app never needs it.
2. Open **SQL Editor** and click **New query**.
   - On GitHub, open `termini-app/supabase/migrations/001_schema.sql`, copy the whole file, paste it, and click **Run**. It should say "Success".
   - Do the same with `002_storage.sql`.
3. Open **Authentication** and find **URL Configuration**.
   - **Site URL:** `https://termini.barberologija.si`
   - **Redirect URLs:** add `https://termini.barberologija.si/**`
   - Also add the temporary Cloudflare address from Part 2 (`https://<project>.pages.dev/**`) so you can test before DNS is ready.
4. In **Authentication**, open the **Email** sign-in settings.
   - **Confirm email** must be ON. This is what stops fake sign-ups.
   - Set the minimum password length to **8**.
5. In **Authentication**, open **Email Templates** and replace the "Confirm signup" and "Reset password" texts with the Slovenian ones from `supabase/email-templates.md`.
6. Open **Project Settings** and find **API Keys**. Keep this tab open; you need three values in Part 2:
   - the **Project URL**
   - the **publishable** key (older projects call it `anon`). This one is public.
   - the **secret** key (older projects call it `service_role`). This one is secret.

Until Part 3 is done, Supabase sends verification emails only to your own Supabase account's email address, and only a few per hour. That is enough for your first test.

---

## Part 2: Cloudflare Pages (hosting)

1. Go to **cloudflare.com**, create an account, and open **Workers & Pages**.
2. Click **Create**, choose **Pages**, then **Connect to Git** (it may say "Import an existing Git repository"). Sign in to GitHub and choose the repository `barberologija-dot/Claude`.
3. Build settings:
   - **Production branch:** `claude/vibrant-hamilton-70ohhu` (change it to `main` later, once the work is merged)
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `termini-app`
4. Add these under **Environment variables** (also found later under **Settings**, **Variables and Secrets**):

   | Name | Value | Type |
   |---|---|---|
   | `VITE_SUPABASE_URL` | Project URL from Supabase | Text |
   | `VITE_SUPABASE_ANON_KEY` | publishable (anon) key from Supabase | Text |
   | `SUPABASE_URL` | Project URL from Supabase (same as above) | Text |
   | `SUPABASE_SERVICE_ROLE_KEY` | secret (service_role) key from Supabase | **Secret** |
   | `PUBLIC_URL` | `https://termini.barberologija.si` | Text |
   | `NODE_VERSION` | `22` | Text |

5. Click **Save and Deploy**. After a minute or two you get an address like `https://something.pages.dev`. Open it on your phone; you should see the start page in Slovenian.

---

## Part 3: Brevo (email)

1. Go to **brevo.com** and create a free account (300 emails a day). Brevo may take a day or so to approve the account for sending.
2. In Brevo, open **Senders, Domains & Dedicated IPs** and add the domain `barberologija.si`. Brevo shows a few DNS records to add.
   - **Stop here and send a screenshot of those records before adding them.** They go into the same cPanel Zone Editor as before. They only add new lines, but I want to check them against your existing email setup first.
3. Add the sender address, for example `termini@barberologija.si`.
4. Create two keys in Brevo under **SMTP & API**:
   - an **API key**. In Cloudflare, add it as `BREVO_API_KEY` (type **Secret**).
   - an **SMTP key**. This goes into Supabase in the next step.
5. In Cloudflare, also add:
   - `MAIL_FROM` = `termini@barberologija.si`
   - `MAIL_REPLY_TO` = `info@barberologija.si` (replies from customers land in your normal inbox)

   Then open **Deployments** and click **Retry deployment** so the new settings take effect.
6. In Supabase, open **Authentication**, **Emails**, **SMTP Settings**, and turn on **Custom SMTP**:
   - Host: `smtp-relay.brevo.com`, Port: `587`
   - Username: the SMTP login shown in Brevo
   - Password: the SMTP key from step 4
   - Sender email: `termini@barberologija.si`, Sender name: `Termini`

   Now verification emails go to every customer, not only to you.

---

## Part 4: The subdomain

1. In Cloudflare, open your Pages project, go to **Custom domains**, click **Set up a custom domain**, and type `termini.barberologija.si`.
2. Cloudflare shows a CNAME record. In the NEOSERV cPanel, open **Zone Editor**, click **Manage** next to `barberologija.si`, then **Add Record**:
   - **Name:** `termini`
   - **Type:** `CNAME`
   - **Record:** the address Cloudflare shows (it ends in `.pages.dev`)
   - Click **Save Record**.
3. Do not edit or delete any existing record. The line `barberologija.si → 23.227.38.65` is your Shopify store.
4. Back in Cloudflare, wait until the domain shows **Active**. This usually takes a few minutes, sometimes up to an hour.

---

## Part 5: Test on your phone

Open `https://termini.barberologija.si` (or the `.pages.dev` address).

**As a barbershop**
1. Tap **Registriraj brivnico**, switch to **Registracija**, and sign up with your own email.
2. Open the verification email and tap the link. You land on "Registriraj brivnico".
3. Enter the shop name and tap **Ustvari brivnico**.
4. Follow the three steps: add a location with working hours, add services, add barbers.
5. Open **Nastavitve** and copy the booking link.

**As a customer** (use a private browser window, or a second phone, and a different email address)
1. Open the booking link.
2. Tap **Rezerviraj termin**, pick a service, a barber and a time.
3. Sign up, verify the email, and tap **Potrdi rezervacijo**.
4. Check that the confirmation email arrives (needs Part 3).
5. Open **Moji termini**; try **Prestavi** and **Prekliči**.

**Back as the barbershop**
1. Open **Koledar** and go to the day you booked. The appointment is there.
2. Tap it and try **Opravljeno** or **Ni prišel**.
3. Tap **＋** and add an appointment by hand at the same time for the same barber. It must be refused.

---

## Optional, before you invite real customers

**Bot check on sign-up (free).** In Cloudflare, open **Turnstile**, add a site for `termini.barberologija.si`, and you get a site key and a secret key. Put the secret key into Supabase under **Authentication**, **Attack Protection** (enable CAPTCHA, provider Turnstile). Add the site key in Cloudflare Pages as `VITE_TURNSTILE_SITE_KEY`, then retry the deployment.

**Legal texts.** The privacy policy and terms are placeholders. They are in `src/i18n/sl.json` under `legal`.
