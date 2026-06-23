# Lumen Commerce — a lightweight store you run yourself

A tiny, Shopify-style online shop that runs entirely in the browser. No server,
no database, no monthly fee. You manage it from your PC and host the storefront
on any plain static web host.

It comes in two parts that share the same folder:

| Part | Folder | What it's for |
|------|--------|---------------|
| **Storefront** | `store/` (`index.html`) | What customers see — browse, cart, checkout |
| **Admin** | `store/admin/` | What you use — products, orders, settings, analytics |

**Live demo:** [storefront](./) · [admin](./admin/)

---

## What it does (the Shopify essentials, simplified)

- **Products** — title, description, price, compare-at (sale) price, SKU, stock,
  image, draft/active status, and **options** like Size or Grind.
- **Collections** — group products so shoppers can browse (e.g. *Single Origin*).
- **Storefront** — homepage, collections, product pages with option pickers, a
  slide-out cart, discount codes, and a clean checkout.
- **Orders** — every checkout is captured. View details, mark paid / fulfilled /
  cancelled. Stock auto-decrements.
- **Customers** — built automatically from orders, with lifetime spend.
- **Discounts** — percentage, fixed-amount, or free-shipping codes with a
  minimum-spend rule.
- **Analytics** — revenue, units, average order value, a 6-month chart, and
  revenue by product and collection.
- **Settings** — store name, logo, accent colour, currency, shipping, tax, and
  how checkouts reach you.
- **Publish & backup** — one click to regenerate the catalog for your host, and
  full JSON backup/restore.

Everything is stored in your browser's `localStorage`, so your data stays on
your machine.

---

## Run it on your PC

You can just **double-click `store/index.html`** to open the storefront, and
`store/admin/index.html` for the admin. For everything to work smoothly
(especially file loading), it's better to serve the folder over a tiny local
web server — the included start scripts do this for you:

- **Windows:** double-click **`start-windows.bat`**
- **Mac / Linux:** double-click **`start-mac-linux.command`**
  (first time on Mac: right-click → Open)

Both open <http://localhost:8787/store/> — the storefront — with the admin at
<http://localhost:8787/store/admin/>. They use Python's built-in web server (no
install needed on Mac/Linux; on Windows install Python from python.org and tick
"Add to PATH").

> The admin and storefront share the same browser storage, so an order you place
> on the storefront shows up instantly in the admin. Great for testing.

---

## Host it on your own website

Because it's just static files, hosting is copy-and-paste:

1. In the admin, open **Publish & backup → Download `catalog.js`** and let it
   replace the one in this folder.
2. Upload the whole **`store/`** folder to your host:
   - **GitHub Pages / Netlify / Vercel** — drag the folder in, done.
   - **cPanel / FTP / shared hosting** — drop it in `public_html`.
   - **S3 / object storage** — upload as a static site.
3. Your shop is live at `yourdomain.com/store/`. Share that link. Keep the
   `admin/` link for yourself (you can leave it up — it only edits *your*
   browser's copy — or remove the folder from the public host and run admin
   locally).

When you change products or settings, just re-download `catalog.js` and
re-upload it. That's the whole publishing workflow.

---

## Taking real orders & payments

Lumen has no built-in payment processor (that's what keeps it free and
serverless). In **Settings → Checkout** you choose how orders reach you:

- **Demo** — orders are recorded in the browser. Perfect for testing or a
  "reserve / request an order" shop where you invoice afterwards.
- **Email** — checkout opens the buyer's email app pre-filled with their order,
  addressed to you.
- **Webhook** — each order is POSTed as JSON to a URL you control (e.g. a
  Zapier/Make automation, a Google Sheet, or your own endpoint), which can then
  email you, create an invoice, or send a payment link.

For card payments, point the webhook at an automation that generates a payment
link (Stripe Payment Links, PayPal, GoCardless, etc.), or take payment on
pickup/delivery.

---

## Files

```
store/
├── index.html        storefront shell
├── storefront.js     storefront app
├── storefront.css    storefront styles
├── catalog.js        your published catalog (the "seed" new visitors load)
├── shared.js         shared data layer (storage, money, cart, discounts)
├── admin/
│   ├── index.html    admin shell
│   ├── admin.js      admin app
│   └── admin.css     admin styles
├── start-windows.bat
└── start-mac-linux.command
```

No build step, no dependencies. Edit a file, refresh the page.
