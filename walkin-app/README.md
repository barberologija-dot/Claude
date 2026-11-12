# Walk-in Queue for Barbershops

Customers don't have to sit in the shop waiting. They scan a QR code, take a number on their phone and watch a live countdown: **your number**, **how many people are ahead**, and **your turn in X min**. Then they come back when it's their turn.

## Run it

```bash
node server.js          # Node 18+, no npm install needed
```

| Screen | URL | Who |
|---|---|---|
| Customer | `http://<server>:3000/` | Customers' phones (via the QR code) |
| Barber dashboard | `http://<server>:3000/barber` | Barbers (default PIN **1234**) |
| Shop TV | `http://<server>:3000/tv` | TV or tablet in the shop: shows who's being served and the QR code |

Environment variables: `PORT` (default 3000), `BARBER_PIN` (PIN used on first start), `DATA_FILE` (default `./data.json`).

## How it works

1. **Customer takes a number.** They enter a name and pick a service (Haircut / Beard / Cut + Beard). Their ticket is remembered on their phone.
2. **Live ticket.** Shows their number, how many people are ahead, a row of people in front of them, and a countdown ring with "Your turn in X min". It updates instantly when the barber presses a button.
3. **Alerts.** At about 10 minutes away it says "start heading to the shop". When they're next, and when it's their turn, the phone beeps and vibrates and shows a notification if they allowed it. The page must stay open in the browser for this.
4. **Barber dashboard.** Shows each chair with **Call next** / **Done · call next**, the queue with **Start** and **No-show**, a box to add walk-ins without a phone, and settings: open/close walk-ins, number of chairs, services, prices and times, and the PIN.
5. **Smart wait times.** The app simulates every chair, using each service's time and how long the cuts in progress have taken so far. It learns the shop's real speed from finished cuts, which also drives "Avg. cut ≈ X min".
6. Numbers restart at #1 every day.

## Putting it online

The app needs to run somewhere customers' phones can reach it. Any Node host works (Render, Railway, Fly.io, a VPS). `data.json` must be on persistent storage. Print the QR code from `/tv`, or show it on a screen in the shop.

## Next steps (not built yet)

- SMS / WhatsApp message when it's almost your turn, so customers can close the browser (Twilio or similar)
- Pick a specific barber
- Multi-language UI (e.g. Serbian / English)
- Daily stats (customers served, average wait)
