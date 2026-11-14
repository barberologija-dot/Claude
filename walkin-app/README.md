# Walk-in Queue for Barbershops (Slovenian)

Customers don't have to sit in the shop waiting. They scan a QR code, take a number on their phone, and get a live countdown: **Tvoja št.** (your number), **Pred tabo** (people ahead of you) and **Na vrsti čez X min** (your turn in X min). **WhatsApp messages in Slovenian** tell them when to head over.

The whole app is in Slovenian (customer, barber and TV screens, and all WhatsApp messages). Prices are in €.

## Run it

```bash
node server.js          # Node 18+, no npm install needed
```

| Screen | URL | Who |
|---|---|---|
| Customer | `/` | Customers' phones (via the QR code) |
| Barber dashboard | `/barber` | Barbers (default PIN **1234**, change it in *Nastavitve*) |
| Shop TV | `/tv` | TV or tablet in the shop: who's in the chair, who's waiting, the QR code |

## How the WhatsApp alerts work

1. The customer takes a number and taps **"Obvesti me na WhatsApp"**.
2. WhatsApp opens with a prefilled message: *"Obvesti me, ko pridem na vrsto. Koda: #K7QF2"*. The customer presses **Pošlji** (send).
3. The app links their phone to their place in line and replies with their number, how many are ahead and the expected time.
4. The app sends these automatically, once each:
   - ⏰ about 15 min before their turn: *"Kmalu boš na vrsti … odpravi se v brivnico"* (it's almost your turn, head to the shop)
   - 🔔 when nobody is ahead: *"Pred tabo ni nikogar več! Pridi zdaj v brivnico."* (nobody is ahead of you, come to the shop now)
   - ✂️ when the barber calls them: *"Na vrsti si! Pridi na stol 2."* (it's your turn, come to chair 2)
   - if the barber marks them as not present: a message that their number was skipped
5. Customers can reply **STANJE** (status) to get their current status, or **ODJAVA** (leave) to leave the queue.

Because the customer writes first, the shop can answer with normal messages for 24 hours. **No Meta template approval is needed**, and Meta doesn't charge for conversations the customer starts.

### WhatsApp setup (one time, about 30 min)

1. Go to https://developers.facebook.com → **Create app** → type **Business** → add the **WhatsApp** product.
2. In **WhatsApp → API Setup**, add the shop's phone number. It must be a number **not** already used in the normal WhatsApp app. A new SIM or a landline works. Copy the **Phone number ID**.
3. In **Business Settings → System users**, create a system user, give it the app with `whatsapp_business_messaging`, and generate a **permanent token**.
4. In **WhatsApp → Configuration → Webhook**:
   - Callback URL: `https://YOUR-DOMAIN/webhook/whatsapp`
   - Verify token: the same value as `WA_VERIFY_TOKEN`
   - Subscribe to the **messages** field.
5. Copy the **App secret** from **App settings → Basic**.
6. Start the server with these settings:

```bash
WA_TOKEN=EAAG...            # permanent token
WA_PHONE_ID=1234567890      # Phone number ID
WA_NUMBER=38640123456       # the shop's WhatsApp number, with 386, no +
WA_APP_SECRET=abc123...     # checks that messages really come from Meta
WA_VERIFY_TOKEN=brivnica    # any word; the same one in the Meta webhook settings
PUBLIC_URL=https://YOUR-DOMAIN   # used in messages ("take a new number here: ...")
node server.js
```

Optional: `WA_SOON_MIN=15` (how many minutes before the turn to send the "head over" alert), `PORT`, `BARBER_PIN`, `DATA_FILE`, `TZ_SHOP` (default `Europe/Ljubljana`).

Without the `WA_*` settings the app still works. The WhatsApp button is just hidden.

## Putting it online

The app has to be reachable on the internet (HTTPS) so phones and Meta's webhook can reach it. Any Node host works: Render, Railway, Fly.io or a VPS. `data.json` must be on persistent storage. Print the QR code from `/tv`, or show `/tv` on a screen in the shop.

## Other features

- Wait times are calculated across all chairs and learn the shop's real speed from finished cuts.
- Barber dashboard: call next, finish, start, no-show, add customers without a phone, open or close walk-ins, set the number of chairs, services, prices and times.
- Numbers restart at #1 every day (Slovenian time).
