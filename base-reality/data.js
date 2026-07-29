/* ============================================================================
   Base Reality — company database + template registry
   ----------------------------------------------------------------------------
   This file IS the drop-in point for the scraped company list. Replace/extend
   BR_COMPANIES with generated records (one per mailed login). Everything the
   site generator renders comes from these fields — no per-company code.

   Record schema (fields marked ? are optional — the generator degrades
   gracefully when they're missing, which is normal for scraped data):

   {
     id:        "unique-slug",            // stable internal id
     code:      "BR-XXXX-XXXX",           // the access code printed on the mailer
     name:      "Business name",
     trade:     "plumber",                // free text, shown + used for icon picks
     town:      "Harrogate",
     postcode?: "HG1 1AA",
     phone?:    "01423 000000",
     email?:    "info@example.co.uk",
     address?:  "12 High Street, Harrogate",
     tagline?:  "A line for the hero",    // generator invents one if missing
     about?:    "A paragraph about them", // from their old site / listing
     services:  ["Service one", ...],     // 3–8 entries
     reviews?:  [{ text, name }, ...],    // from Google/Facebook listings
     hours?:    "Mon–Fri 8am–5pm",
     founded?:  2004,                     // number (year)
     logoUrl?:  "https://…/logo.png",     // scraped logo; monogram used if absent
     colors:    { primary:"#0f766e", accent:"#f59e0b" },  // from logo/branding
     template:  "bold-trade"              // one of BR_TEMPLATES keys
   }
   ========================================================================== */

// ---- Template families -----------------------------------------------------
// Each family is a full look-and-feel: layout, typography, section order.
// The generator combines a family with the company's own colours, so
// 5 families × per-company branding reads as a one-off design every time.
const BR_TEMPLATES = {
  "bold-trade": {
    label: "Bold Trade",
    vibe: "Dark, confident, big type — trades & home services",
    fonts: { head: "'Arial Black','Segoe UI',system-ui,sans-serif", body: "'Segoe UI',system-ui,sans-serif" },
    suits: ["plumber", "electrician", "builder", "roofer", "garage", "locksmith", "landscaper"]
  },
  "fresh-local": {
    label: "Fresh Local",
    vibe: "Light, warm, rounded — food, flowers, neighbourhood shops",
    fonts: { head: "Georgia,'Times New Roman',serif", body: "'Segoe UI',system-ui,sans-serif" },
    suits: ["bakery", "cafe", "florist", "deli", "greengrocer", "butcher"]
  },
  "classic-craft": {
    label: "Classic Craft",
    vibe: "Serif, paper tones, heritage — makers & long-established firms",
    fonts: { head: "Georgia,'Times New Roman',serif", body: "Georgia,'Times New Roman',serif" },
    suits: ["carpenter", "tailor", "upholsterer", "antiques", "picture framer", "cobbler"]
  },
  "sleek-pro": {
    label: "Sleek Pro",
    vibe: "Minimal, spacious, precise — professional & appointment-led",
    fonts: { head: "'Segoe UI',system-ui,sans-serif", body: "'Segoe UI',system-ui,sans-serif" },
    suits: ["accountant", "solicitor", "clinic", "physio", "salon", "optician", "dentist"]
  },
  "vivid-shop": {
    label: "Vivid Shop",
    vibe: "Colourful, energetic, friendly — barbers, gyms, pets, kids",
    suits: ["barber", "gym", "dog groomer", "pet shop", "toy shop", "tattoo studio"],
    fonts: { head: "'Trebuchet MS','Segoe UI',sans-serif", body: "'Segoe UI',system-ui,sans-serif" }
  }
};

// ---- Pricing shown in the claim flow --------------------------------------
const BR_OFFER = {
  studioName: "Base Reality",
  studioEmail: "hello@base-reality.com",
  studioPhone: "",
  // Deliberately simple + competitive — the mailer already did the selling.
  tiers: [
    {
      id: "launch", name: "Launch", price: "£249", term: "one-off",
      headline: "Exactly what you're looking at, live",
      includes: ["This design, finished & polished", "Your own domain connected", "Mobile-ready & fast", "Contact form to your email", "Live in 7 days"]
    },
    {
      id: "grow", name: "Grow", price: "£39", term: "/month",
      headline: "We build it, host it and keep it working",
      badge: "Most popular",
      includes: ["Everything in Launch", "Hosting, security & backups", "Unlimited small changes", "Google Business Profile setup", "Monthly visitor report"]
    },
    {
      id: "custom", name: "Custom", price: "Let's talk", term: "",
      headline: "Booking, e-commerce or something bigger",
      includes: ["Online booking / payments", "Photo & copywriting session", "Multi-page build", "Priced per project"]
    }
  ]
};

// ---- Seed companies --------------------------------------------------------
// Ten realistic-but-fictional local businesses covering every template family,
// so the whole flow can be demoed before the scraped database is plugged in.
const BR_COMPANIES = [
  {
    id: "hartley-plumbing",
    code: "BR-7K2M-PLMB",
    name: "Hartley Plumbing & Heating",
    trade: "plumber",
    town: "Harrogate",
    postcode: "HG1 4QT",
    phone: "01423 556 210",
    email: "jobs@hartleyplumbing.co.uk",
    address: "Unit 6, Claro Court Business Park, Harrogate",
    about: "Family-run plumbing and heating firm covering Harrogate and the surrounding villages for over 20 years. Gas Safe registered, fully insured, and known for turning up when we say we will.",
    services: ["Boiler installation & servicing", "Emergency call-outs", "Bathroom installation", "Radiators & central heating", "Leak detection & repair", "Landlord gas certificates"],
    reviews: [
      { text: "Fitted our new boiler in a day and left the place spotless. Straightforward price, no surprises.", name: "Karen M., Harrogate" },
      { text: "Came out within the hour on a Sunday when our tank burst. Lifesavers.", name: "Dave P., Knaresborough" },
      { text: "Used Hartley's for all our rental properties for years. Reliable every time.", name: "S. Whitfield, lettings agent" }
    ],
    hours: "Mon–Fri 7:30am–6pm · 24hr emergency line",
    founded: 2002,
    colors: { primary: "#0e5a8a", accent: "#f59e0b" },
    template: "bold-trade"
  },
  {
    id: "the-flour-house",
    code: "BR-9D4V-BAKE",
    name: "The Flour House Bakery",
    trade: "bakery",
    town: "Ripon",
    postcode: "HG4 1BP",
    phone: "01765 601 884",
    email: "hello@flourhousebakery.co.uk",
    address: "23 Kirkgate, Ripon",
    tagline: "Real bread, baked before the city wakes",
    about: "A small sourdough bakery on Kirkgate. Everything is mixed, shaped and baked on site each morning — slow-fermented loaves, pastries and proper coffee.",
    services: ["Sourdough loaves & baguettes", "Morning pastries", "Celebration cakes to order", "Wholesale for cafés", "Coffee & takeaway counter"],
    reviews: [
      { text: "The best sourdough for miles. Get there before 10 or it's gone.", name: "Ellie R." },
      { text: "They made our wedding cake — beautiful and delicious.", name: "Tom & Priya" }
    ],
    hours: "Tue–Sat 7:30am–2pm",
    founded: 2017,
    colors: { primary: "#9a5b2e", accent: "#3f6c45" },
    template: "fresh-local"
  },
  {
    id: "bishop-monkton-joinery",
    code: "BR-2Q8N-JOIN",
    name: "Bishop Monkton Joinery",
    trade: "carpenter",
    town: "Bishop Monkton",
    postcode: "HG3 3QN",
    phone: "01765 677 402",
    email: "workshop@bmjoinery.co.uk",
    about: "Bespoke joinery workshop making fitted furniture, staircases and hardwood windows. Three generations of the same family at the bench since 1968.",
    services: ["Fitted wardrobes & alcove units", "Staircases", "Hardwood windows & doors", "Kitchen fitting", "Heritage & listed-building work"],
    reviews: [
      { text: "The alcove cabinets are the best thing in our house. Proper craftsmanship.", name: "J. Ainsworth" },
      { text: "Matched the original Victorian mouldings perfectly on our listed cottage.", name: "M. Berry, Ripon" }
    ],
    hours: "Mon–Fri 8am–5pm",
    founded: 1968,
    colors: { primary: "#5b4636", accent: "#b3762f" },
    template: "classic-craft"
  },
  {
    id: "align-physio",
    code: "BR-5T1X-PHYS",
    name: "Align Physiotherapy",
    trade: "physio",
    town: "Harrogate",
    postcode: "HG2 8RB",
    phone: "01423 313 970",
    email: "reception@alignphysio.co.uk",
    address: "The Old Chapel, Leeds Road, Harrogate",
    tagline: "Move well again",
    about: "Chartered physiotherapists treating sports injuries, back and neck pain, and post-surgical rehab. HCPC registered and recognised by all major health insurers.",
    services: ["Sports injury treatment", "Back & neck pain", "Post-operative rehab", "Sports massage", "Acupuncture & dry needling", "Home visits"],
    reviews: [
      { text: "Sorted the shoulder problem two other clinics couldn't. Clear plan from day one.", name: "R. Calder" },
      { text: "Got me back running after my knee op ahead of schedule.", name: "Anna S." }
    ],
    hours: "Mon–Fri 8am–7pm · Sat 9am–1pm",
    founded: 2011,
    colors: { primary: "#0f766e", accent: "#84cc16" },
    template: "sleek-pro"
  },
  {
    id: "kings-cuts",
    code: "BR-8H6R-BARB",
    name: "King's Cuts Barbershop",
    trade: "barber",
    town: "Knaresborough",
    postcode: "HG5 8AL",
    phone: "01423 862 118",
    address: "4 Market Place, Knaresborough",
    tagline: "Walk in scruffy, walk out sharp",
    about: "Traditional barbering with a modern edge, right on the Market Place. Walk-ins welcome, skin fades a speciality, hot-towel shaves by appointment.",
    services: ["Skin fades & classic cuts", "Beard trims & shaping", "Hot-towel wet shaves", "Kids' cuts", "Student Mondays"],
    reviews: [
      { text: "Best fade in town, every single time.", name: "Liam" },
      { text: "Took my lad for his first proper cut — they were brilliant with him.", name: "Gemma W." }
    ],
    hours: "Mon–Sat 9am–6pm · late night Thu",
    founded: 2019,
    colors: { primary: "#1f2937", accent: "#e11d48" },
    template: "vivid-shop"
  },
  {
    id: "dales-electrical",
    code: "BR-4W9J-ELEC",
    name: "Dales Electrical Services",
    trade: "electrician",
    town: "Pateley Bridge",
    postcode: "HG3 5AW",
    phone: "01423 711 655",
    email: "info@daleselectrical.co.uk",
    about: "NICEIC-approved electricians covering Nidderdale and Harrogate. Rewires, EV chargers, fuse boards and everything in between — domestic and agricultural.",
    services: ["Full & partial rewires", "EV charger installation", "Consumer unit upgrades", "EICR safety reports", "Outdoor & security lighting", "Agricultural installations"],
    reviews: [
      { text: "Rewired our farmhouse with minimal mess and total professionalism.", name: "H. Metcalfe" },
      { text: "EV charger fitted within the week, handled the grant paperwork too.", name: "Chris B." }
    ],
    hours: "Mon–Fri 8am–5:30pm",
    founded: 2008,
    colors: { primary: "#b45309", accent: "#1d4ed8" },
    template: "bold-trade"
  },
  {
    id: "petal-and-stem",
    code: "BR-6L3C-FLWR",
    name: "Petal & Stem",
    trade: "florist",
    town: "Boroughbridge",
    postcode: "YO51 9AW",
    phone: "01423 322 540",
    email: "orders@petalandstem.co.uk",
    address: "8 St James Square, Boroughbridge",
    about: "Independent florist on St James Square creating seasonal bouquets, wedding flowers and funeral tributes with British-grown blooms wherever we can.",
    services: ["Bouquets & same-day delivery", "Wedding & event flowers", "Funeral tributes", "Weekly office flowers", "Flower school workshops"],
    reviews: [
      { text: "Our wedding flowers were beyond anything we imagined.", name: "Sophie & Dan" },
      { text: "Always fresh, always beautiful — my go-to for every occasion.", name: "Mrs L. Hargreaves" }
    ],
    hours: "Mon–Sat 9am–5pm",
    founded: 2014,
    colors: { primary: "#86487e", accent: "#4d7c0f" },
    template: "fresh-local"
  },
  {
    id: "wharfedale-accounts",
    code: "BR-3F7P-ACCT",
    name: "Wharfedale Accountancy",
    trade: "accountant",
    town: "Otley",
    postcode: "LS21 3AQ",
    phone: "01943 465 220",
    email: "office@wharfedaleaccounts.co.uk",
    address: "Bridge House, Kirkgate, Otley",
    tagline: "Numbers handled. Sleep restored.",
    about: "A friendly two-partner practice looking after sole traders, landlords and family companies across Wharfedale. Fixed fees, plain English, no surprises in January.",
    services: ["Year-end accounts & tax returns", "VAT & bookkeeping", "Payroll & CIS", "Company formation", "Making Tax Digital setup", "Landlord tax"],
    reviews: [
      { text: "Moved to them after years of chasing our old accountant. Night and day.", name: "T. Ogden, builder" },
      { text: "They actually explain things. Fixed fee, no clock-watching.", name: "Rachel F., café owner" }
    ],
    hours: "Mon–Fri 9am–5pm",
    founded: 1996,
    colors: { primary: "#1e3a5f", accent: "#0e9f6e" },
    template: "sleek-pro"
  },
  {
    id: "brook-street-motors",
    code: "BR-1V5B-MOTR",
    name: "Brook Street Motors",
    trade: "garage",
    town: "Wetherby",
    postcode: "LS22 6NL",
    phone: "01937 584 771",
    address: "Brook Street Works, Wetherby",
    about: "Independent garage doing MOTs, servicing and diagnostics on all makes. Main-dealer capability without main-dealer prices — courtesy car available.",
    services: ["MOT testing", "Servicing (all makes)", "Diagnostics & electrical faults", "Brakes, clutches & cambelts", "Tyres & tracking", "Air-con regas"],
    reviews: [
      { text: "Honest garage — told me the fault was a £20 sensor, not the gearbox a dealer quoted.", name: "P. Neill" },
      { text: "MOT and service done same day with a courtesy car. Spot on.", name: "Donna K." }
    ],
    hours: "Mon–Fri 8am–5:30pm · Sat 8:30am–12:30pm",
    founded: 2005,
    colors: { primary: "#111827", accent: "#dc2626" },
    template: "bold-trade"
  },
  {
    id: "paws-on-parade",
    code: "BR-0N8Y-GRMR",
    name: "Paws on Parade",
    trade: "dog groomer",
    town: "Harrogate",
    postcode: "HG1 5LQ",
    phone: "07811 204 663",
    email: "bookings@pawsonparade.co.uk",
    tagline: "Every dog leaves looking show-ready",
    about: "City & Guilds qualified dog grooming studio. Calm, one-to-one appointments — nervous dogs and puppies especially welcome.",
    services: ["Full groom & style", "Bath, brush & blow-dry", "Puppy introduction sessions", "De-shedding treatments", "Nail clipping & ear care"],
    reviews: [
      { text: "Our anxious rescue actually pulls on the lead to get IN now.", name: "Beth & Alfie" },
      { text: "Best our cockapoo has ever looked. Booked in monthly.", name: "The Harrisons" }
    ],
    hours: "Tue–Sat 9am–5pm",
    founded: 2021,
    colors: { primary: "#7c3aed", accent: "#f59e0b" },
    template: "vivid-shop"
  }
];
