/* ============================================================================
 * Lumen Commerce — published catalog (the "seed")
 * ----------------------------------------------------------------------------
 * This file is what a brand-new visitor to your storefront loads first.
 * Edit your store in the Admin app, then click "Publish store" to download a
 * fresh copy of THIS file and upload it to your web host. That's how changes
 * you make on your PC reach the public storefront.
 *
 * It is plain JavaScript so it works on any static host with zero backend.
 * ==========================================================================*/
window.LUMEN_SEED = {
  settings: {
    name: "Hearth Coffee Roasters",
    tagline: "Small-batch coffee, roasted to order.",
    currencyCode: "GBP",
    currencySymbol: "£",
    accent: "#b5471f",
    logo: "",                       // optional image URL; falls back to ◆ mark
    email: "hello@hearthcoffee.example",
    about:
      "Hearth is a tiny roastery on the south coast. We roast in small batches " +
      "twice a week and ship within 24 hours so the coffee lands as fresh as it can.",
    shippingFlat: 3.95,
    freeShippingOver: 30,
    taxRate: 0,                     // percent, e.g. 20 for 20% VAT-inclusive display
    taxIncluded: true,
    checkoutMode: "demo",           // 'demo' | 'email' | 'webhook'
    webhookUrl: "",
    socialUrl: "",
    footerNote: "Roasted in small batches · Free local pickup at the roastery"
  },

  collections: [
    { id: "col_single",  title: "Single Origin", slug: "single-origin",
      description: "Traceable lots from one farm or co-op, roasted to show off origin character." },
    { id: "col_blend",   title: "Blends",        slug: "blends",
      description: "Everyday, dependable cups built to taste great with milk or black." },
    { id: "col_gear",    title: "Gear",          slug: "gear",
      description: "The few bits of kit we actually use every morning." }
  ],

  products: [
    {
      id: "p_ethiopia", title: "Ethiopia Guji — Washed", slug: "ethiopia-guji",
      description:
        "Bright and floral with jasmine, bergamot and a clean stone-fruit finish. " +
        "A washed lot from the Guji zone — our most aromatic coffee.",
      price: 11.5, compareAt: 0, sku: "ETH-GUJI-250",
      inventory: 24, images: ["https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80"],
      status: "active", featured: true, collectionIds: ["col_single"],
      options: [{ name: "Grind", values: ["Whole bean", "Filter", "Espresso", "Cafetiere"] },
                { name: "Size",  values: ["250g", "1kg"] }]
    },
    {
      id: "p_colombia", title: "Colombia Huila — Honey", slug: "colombia-huila",
      description:
        "Sweet and syrupy: red apple, brown sugar and milk chocolate. A honey-process " +
        "lot that bridges fruit-forward and comfort.",
      price: 10.5, compareAt: 12, sku: "COL-HUILA-250",
      inventory: 31, images: ["https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=800&q=80"],
      status: "active", featured: true, collectionIds: ["col_single"],
      options: [{ name: "Grind", values: ["Whole bean", "Filter", "Espresso", "Cafetiere"] },
                { name: "Size",  values: ["250g", "1kg"] }]
    },
    {
      id: "p_hearth", title: "Hearth House Blend", slug: "hearth-house-blend",
      description:
        "Our daily driver. Cocoa, toasted hazelnut and a round caramel sweetness. " +
        "Forgiving to brew, brilliant with milk.",
      price: 9.0, compareAt: 0, sku: "HOUSE-250",
      inventory: 60, images: ["https://images.unsplash.com/photo-1442550528053-c431ecb55509?w=800&q=80"],
      status: "active", featured: true, collectionIds: ["col_blend"],
      options: [{ name: "Grind", values: ["Whole bean", "Filter", "Espresso", "Cafetiere"] },
                { name: "Size",  values: ["250g", "1kg"] }]
    },
    {
      id: "p_decaf", title: "Midnight Decaf", slug: "midnight-decaf",
      description:
        "Sugarcane-process decaf with dried fig, cocoa and a soft, sweet finish. " +
        "All of the ritual, none of the buzz.",
      price: 9.5, compareAt: 0, sku: "DECAF-250",
      inventory: 18, images: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80"],
      status: "active", featured: false, collectionIds: ["col_blend"],
      options: [{ name: "Grind", values: ["Whole bean", "Filter", "Espresso", "Cafetiere"] },
                { name: "Size",  values: ["250g", "1kg"] }]
    },
    {
      id: "p_dripper", title: "Glass Pour-Over Dripper", slug: "pour-over-dripper",
      description:
        "A simple glass V-style dripper for clean, bright filter coffee. Pairs with " +
        "standard #2 paper filters.",
      price: 18.0, compareAt: 0, sku: "GEAR-DRIP",
      inventory: 12, images: ["https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&q=80"],
      status: "active", featured: false, collectionIds: ["col_gear"],
      options: []
    },
    {
      id: "p_subscription", title: "Roaster's Choice Subscription", slug: "subscription",
      description:
        "Let us pick. Every two weeks we ship whatever we're most excited about that " +
        "morning. Pause or cancel anytime.",
      price: 22.0, compareAt: 0, sku: "SUB-2WK",
      inventory: 999, images: ["https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80"],
      status: "active", featured: true, collectionIds: ["col_blend"],
      options: [{ name: "Cadence", values: ["Every 2 weeks", "Monthly"] },
                { name: "Grind",   values: ["Whole bean", "Filter", "Espresso"] }]
    }
  ],

  discounts: [
    { id: "d_welcome", code: "WELCOME10", type: "percent", value: 10, active: true, minSubtotal: 0 },
    { id: "d_ship",    code: "FREESHIP",  type: "freeship", value: 0,  active: true, minSubtotal: 15 }
  ],

  // Demo orders so the dashboard and analytics aren't empty on first run.
  // (Real orders placed through checkout get appended to these.)
  orders: [
    { id: "o_1001", number: 1001, createdAt: "2026-06-10T09:14:00Z", status: "fulfilled",
      customer: { name: "Amelia Court", email: "amelia@example.com", address: "12 Marine Parade",
                  city: "Brighton", postcode: "BN2 1TL", country: "United Kingdom", phone: "" },
      items: [{ productId: "p_ethiopia", title: "Ethiopia Guji — Washed", price: 11.5, qty: 1,
                options: { Grind: "Filter", Size: "250g" } },
              { productId: "p_hearth", title: "Hearth House Blend", price: 9.0, qty: 2,
                options: { Grind: "Espresso", Size: "250g" } }],
      subtotal: 29.5, discount: 0, discountCode: "", shipping: 3.95, tax: 0, total: 33.45, note: "" },
    { id: "o_1002", number: 1002, createdAt: "2026-06-15T16:02:00Z", status: "paid",
      customer: { name: "Daniel Hsu", email: "dan@example.com", address: "4 Old Town Rd",
                  city: "Hastings", postcode: "TN34 3EW", country: "United Kingdom", phone: "" },
      items: [{ productId: "p_colombia", title: "Colombia Huila — Honey", price: 10.5, qty: 1,
                options: { Grind: "Whole bean", Size: "1kg" } }],
      subtotal: 10.5, discount: 1.05, discountCode: "WELCOME10", shipping: 3.95, tax: 0, total: 13.40, note: "" },
    { id: "o_1003", number: 1003, createdAt: "2026-06-20T11:48:00Z", status: "pending",
      customer: { name: "Priya Naidu", email: "priya@example.com", address: "88 Queens Rd",
                  city: "Brighton", postcode: "BN1 3XE", country: "United Kingdom", phone: "" },
      items: [{ productId: "p_subscription", title: "Roaster's Choice Subscription", price: 22.0, qty: 1,
                options: { Cadence: "Every 2 weeks", Grind: "Filter" } },
              { productId: "p_dripper", title: "Glass Pour-Over Dripper", price: 18.0, qty: 1, options: {} }],
      subtotal: 40.0, discount: 0, discountCode: "", shipping: 0, tax: 0, total: 40.0, note: "Gift — no receipt please" }
  ]
};
