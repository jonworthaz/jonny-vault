// Idea board data — edit this file to add or update ideas.
// Each idea renders as a card on the dashboard (index.html).
// `status` controls the colour pill: "raw" | "exploring" | "building" | "parked" | "shipped".

const IDEAS = [
  {
    id: "01",
    title: "3D Layered Images",
    status: "raw",
    tags: ["images", "3d", "physical", "digital"],
    oneLiner:
      "Images with depth that appear to move as you walk past — no glasses, no headset.",
    coreIdea:
      "Split an image into depth layers (foreground / midground / background) and present them so the viewer's changing angle — from walking past, or tilting a phone — reveals parallax: near layers shift more than far ones. The brain reads that relative motion as genuine 3D depth.",
    whyInteresting: [
      "Works without 3D glasses or a headset.",
      "The “wow” moment is involuntary — people stop and move side to side.",
      "Maps onto things people already buy: posters, album art, signage, shopfronts, greetings cards, digital collectibles, gallery pieces.",
    ],
    approaches: [
      { approach: "Lenticular print", medium: "Physical", how: "Ridged lens sheet over interlaced layered image; angle selects which slice you see", effort: "Low–Med" },
      { approach: "Parallax / “depthy” web", medium: "Screen", how: "Layers as PNGs with depth; move on scroll, mouse, or device gyroscope", effort: "Low" },
      { approach: "Depth-map 2D→3D", medium: "Screen", how: "One photo + AI-generated depth map → fake parallax on motion", effort: "Med" },
      { approach: "Light-field / holographic display", medium: "Hardware", how: "True multi-view (Looking Glass etc.) — real depth from any angle", effort: "High" },
      { approach: "Layered physical “shadow box”", medium: "Physical", how: "Real cut layers spaced apart in a frame; parallax is genuine", effort: "Med" },
    ],
    cheapestDemo: [
      "Take or generate an image.",
      "Auto-generate a depth map (AI), or hand-cut 3 layers in any editor.",
      "Drop the layers into a parallax viewer that responds to the phone's gyroscope / cursor position.",
      "Ship as a web page → instant “walk past and it moves” on mobile.",
    ],
    openQuestions: [
      "Physical product (lenticular / shadow box) or digital (web / display)?",
      "Is the value the effect (sell prints) or the tool (let anyone turn a photo into a layered 3D image)?",
      "Single hero use case to nail first: posters? shopfront signage? phone wallpapers? gift cards?",
    ],
    nextStep:
      "Build the cheapest demo above, look at it on a phone, then decide which direction is worth more than an afternoon.",
    note:
      "This repo already has an in-browser image tool (image-annotator/) — a zero-dependency, runs-locally pattern the same approach could reuse for a “layer + parallax” web demo.",
  },
];

// Expose for index.html (works whether loaded as a module or a plain script).
if (typeof window !== "undefined") window.IDEAS = IDEAS;
