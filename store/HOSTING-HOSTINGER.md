# Deploying your store to Hostinger (base-reality.com)

This guide puts Lumen Commerce live on your own Hostinger hosting, with real
customer orders emailed to you. It takes about 15 minutes. No coding.

You have two levels — pick one:

- **A. Static (5 min):** the shop is fully browsable; orders come to you by
  email-from-the-buyer or are recorded in your own browser. No PHP needed.
- **B. With the order backend (recommended):** customers' orders are stored on
  *your* server and emailed to you automatically, and you pull them into the
  admin from any device. Uses the PHP that Hostinger already includes.

---

## Before you start

In hPanel (Hostinger's dashboard) make sure **base-reality.com** points at your
hosting and has SSL on (Hostinger → *SSL* → it's usually automatic, so the site
loads on `https://`). You'll upload files into the site's **`public_html`**
folder.

> **Where should the shop live?**
> - At the root → customers visit **base-reality.com** → upload the *contents*
>   of the `store/` folder directly into `public_html`.
> - In a subfolder → customers visit **base-reality.com/store** → upload the
>   whole `store/` folder into `public_html` (so you get `public_html/store/`).
>
> Everything below assumes the **/store** subfolder (easy to keep separate). If
> you host at the root, just drop the `/store` from the URLs.

---

## A. Static deploy (quickest)

1. In the **Admin** app on your PC (open `store/admin/index.html`), set up your
   shop: Settings (name, currency, About), add Products, Collections, Discounts.
2. Go to **Publish & backup → Download `catalog.js`** and let it replace the
   `catalog.js` inside your local `store/` folder.
3. In hPanel open **Files → File Manager**, go into `public_html`, and upload
   the whole **`store`** folder (drag-and-drop the folder, or zip it, upload,
   and *Extract*).
4. Visit **https://base-reality.com/store/** — your shop is live. 🎉

To take orders without PHP, set **Settings → Checkout** to:
- **Email** — checkout opens the buyer's mail app addressed to you, or
- **Demo** — for a "reserve / enquire" shop where you follow up manually.

Re-publishing later = repeat steps 2–3 (just re-upload `catalog.js`).

---

## B. Add the order backend (real orders, automatic emails)

This switches checkout to **Server** mode. Hostinger runs PHP out of the box, so
there's nothing to install.

### 1. Create a sending mailbox (so emails don't go to spam)
In hPanel → **Emails → Email Accounts**, create something like
**orders@base-reality.com**. (You don't have to log into it; it just needs to
exist so your domain can send "From" it.)

### 2. Edit the config
Open `store/api/config.php` on your PC in any text editor and set:

```php
"owner_email" => "you@base-reality.com",     // where order emails land (your real inbox)
"from_email"  => "orders@base-reality.com",  // the mailbox you just created
"store_name"  => "Base Reality",
"admin_key"   => "a-long-random-secret",     // invent ~20+ random characters
```

Keep the `admin_key` private — it's what lets *you* (and only you) pull orders
back into the admin.

### 3. Upload
Upload the `store` folder to `public_html` exactly as in section A (this
includes the `store/api/` folder with `orders.php`, `config.php` and the
protected `data/` folder).

### 4. Point the storefront at it
In the **Admin → Settings → Checkout**:
- Set **How orders reach you** to **Server**.
- **Order endpoint URL:** `https://base-reality.com/store/api/orders.php`
- **Server admin key:** the same `admin_key` you put in `config.php`.
- Click **Test connection** — you should see "Connected ✓".
- **Save settings**, then **Publish & backup → Download `catalog.js`** and
  re-upload it (so the live storefront knows to use Server mode).

### 5. Try it
On **https://base-reality.com/store/**, add something to the cart and place a
test order. You should get an email at `owner_email` within a minute. Back in
the Admin, open **Orders → Sync from server** to pull it in.

That's it — a working shop on your own domain.

---

## How orders flow (Server mode)

```
 Customer (any device)            Your Hostinger host             You
 ─────────────────────            ───────────────────             ───
 places order on the   ──POST──►  orders.php                      
 storefront                       saves to data/orders.jsonl
                                  emails you  ───────────────────► 📧 inbox
                                  
 You, in the Admin    ──GET+key──► orders.php returns all orders
 click "Sync"          ◄─────────  → appears in your dashboard
```

- Order data lives in `store/api/data/orders.jsonl`, which is blocked from the
  web by `store/api/data/.htaccess` (only `orders.php` can read it, and only
  with your key).
- `config.php` is also blocked from being served as text, so your key stays
  secret even if PHP were ever turned off.

## Payments

Lumen deliberately has no built-in card processor (that's what keeps it free and
serverless). Common ways to take money:

- **Payment link by email** — when an order arrives, reply with a
  [Stripe Payment Link](https://stripe.com/payments/payment-links) or PayPal
  request for the total. Simplest to set up.
- **Pay on pickup / delivery / bank transfer** — put instructions in the order
  confirmation (Admin → Settings → About / footer).
- **Automation** — point a Webhook (instead of Server mode) at Zapier/Make to
  auto-create invoices.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| "Test connection" can't reach the URL | Check the URL is exactly `https://…/store/api/orders.php` and that you uploaded the `api` folder. |
| Connected, but "admin key is wrong" | The key in Admin must match `admin_key` in `config.php` character-for-character. |
| No order email arrives | Confirm `from_email` is a mailbox that exists on your domain; check your spam folder; some hosts queue `mail()` for a minute. |
| Orders save but you want them off your browser | They're on the server in `data/orders.jsonl`; the browser copy is just your working view. Use **Download full backup** to archive. |
| Storefront still says "Demo" at checkout | Re-download `catalog.js` after changing Settings and re-upload it. |

## Updating the shop later

Change products/prices/settings in the Admin → **Download `catalog.js`** →
re-upload it to `public_html/store/`. You never need to touch `api/` again
unless you change your email or key.
