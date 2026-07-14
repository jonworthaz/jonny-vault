/* Architect — Agent Creation Wizard
   Local-first, zero-dependency. Interviews you about an objective / job
   description, suggests the right agent, decomposes it into capabilities +
   tasks, asks the clarifying questions a good build needs, then generates:
     1. a production-ready agent spec (best-practice),
     2. an "Architect" master prompt to run in your own Claude/Copilot,
     3. a JSON blueprint (save / re-open).
   No API key, no server, nothing leaves the browser. */

(function () {
  "use strict";

  /* =====================================================================
     Archetype knowledge base — the built-in "suggestions" brain.
     Each archetype seeds capabilities, tasks, clarifying questions,
     guardrails and an output contract.
  ===================================================================== */
  const ARCHETYPES = [
    {
      id: "advisor",
      name: "Advisor / Consultant",
      icon: "🧠",
      blurb: "Reviews a situation and gives expert recommendations (like PackPro AI).",
      keywords: ["consultant","consult","advisor","advise","expert","specification","review","assess","recommend","technologist","engineer","evaluate","packaging","optimis","optimize"],
      users: ["Domain teams", "Managers", "Clients / stakeholders"],
      output: "Key findings · Risks · Recommendations · Estimated impact · Next actions",
      caps: [
        { name: "Specification / Situation Review", tasks: ["Restate the input and list missing details", "Assess against the key criteria", "Flag risks and gaps", "Recommend specific improvements"] },
        { name: "Cost / Value Optimisation", tasks: ["Break cost into drivers from user inputs", "Propose levers with estimated saving ranges", "Flag trade-offs that need re-checking"] },
        { name: "Compliance / Standards Check", tasks: ["Map applicable rules per market", "Return pass / action-needed status", "List what to verify with a specialist"] },
        { name: "Troubleshooting", tasks: ["Restate the failure mode", "Work the probable-cause tree", "Give ranked corrective actions"] }
      ],
      questions: [
        { q: "What domain / industry does the agent advise in?", tag: "scope" },
        { q: "Which standards, regulations or frameworks must it respect?", tag: "compliance" },
        { q: "Where should it draw on real data (specs, datasheets, contracts)?", tag: "knowledge" }
      ],
      guardrails: ["Flag legal/financial/safety decisions for human sign-off — never give final approval", "Quantify with ranges and label estimates; never invent precise figures"]
    },
    {
      id: "support",
      name: "Customer Support",
      icon: "💬",
      blurb: "Answers customer questions, resolves issues, escalates edge cases.",
      keywords: ["support","customer","helpdesk","ticket","service","faq","resolve","complaint","refund","chat","assist","query"],
      users: ["Customers", "Support agents", "Success team"],
      output: "Answer · Steps taken · Follow-up needed · Escalate? (yes/no + why)",
      caps: [
        { name: "Triage & Intent Detection", tasks: ["Classify the request type & urgency", "Detect sentiment / at-risk customers", "Route to the right flow"] },
        { name: "Knowledge-Base Answering", tasks: ["Retrieve relevant help articles", "Answer with a cited source", "Say clearly when the answer is not in the docs"] },
        { name: "Issue Resolution", tasks: ["Walk the customer through steps", "Gather info needed to act", "Confirm resolution"] },
        { name: "Escalation & Handoff", tasks: ["Detect out-of-scope / high-risk cases", "Summarise context for a human", "Set expectations on next steps"] }
      ],
      questions: [
        { q: "What products/services does support cover, and what is out of scope?", tag: "scope" },
        { q: "What is the escalation path when the agent can't resolve it?", tag: "escalation" },
        { q: "What tone should it use (formal, warm, concise)?", tag: "tone" },
        { q: "Which systems must it read from (order status, account, KB)?", tag: "knowledge" }
      ],
      guardrails: ["Never promise refunds, credits or actions it cannot verify are policy", "Escalate account changes, complaints and anything legal to a human"]
    },
    {
      id: "research",
      name: "Research & Analysis",
      icon: "🔎",
      blurb: "Gathers information across sources and synthesises a cited answer.",
      keywords: ["research","analyse","analyst","insight","market","competitor","report","summarise","summary","investigate","study","benchmark","due diligence"],
      users: ["Analysts", "Strategy team", "Leadership"],
      output: "Executive summary · Key findings · Evidence & sources · Confidence · Open questions",
      caps: [
        { name: "Question Framing", tasks: ["Clarify the exact question & success criteria", "Break it into sub-questions", "Define what a good answer looks like"] },
        { name: "Source Gathering", tasks: ["Search across the allowed sources", "Capture citations for every claim", "Note gaps where evidence is thin"] },
        { name: "Synthesis", tasks: ["Reconcile conflicting sources", "Weight by source quality", "Draw out the 'so what'"] },
        { name: "Reporting", tasks: ["Write the summary first", "Show evidence with sources", "State confidence and caveats"] }
      ],
      questions: [
        { q: "What sources is it allowed / expected to use (internal docs, web, specific sites)?", tag: "knowledge" },
        { q: "How deep should it go (quick scan vs. exhaustive)?", tag: "scope" },
        { q: "What format should the output take (memo, table, slides)?", tag: "format" }
      ],
      guardrails: ["Cite every non-obvious claim; if it can't verify, say so — no fabricated sources or figures", "Separate fact from inference explicitly"]
    },
    {
      id: "content",
      name: "Content & Copywriting",
      icon: "✍️",
      blurb: "Produces on-brand copy: ads, emails, posts, landing pages.",
      keywords: ["content","copy","copywriter","write","marketing","blog","email","social","seo","brand","campaign","newsletter","ad"],
      users: ["Marketing", "Founders", "Social team"],
      output: "Draft · Variants · Rationale · Suggested next test",
      caps: [
        { name: "Brief Intake", tasks: ["Capture audience, goal, channel & tone", "Confirm the offer and CTA", "Note brand do's and don'ts"] },
        { name: "Drafting", tasks: ["Produce a primary draft", "Generate 2–3 variants for testing", "Match the brand voice"] },
        { name: "Editing & Optimisation", tasks: ["Tighten for clarity & hook", "Check reading level & length for channel", "Apply SEO / platform norms"] },
        { name: "Repurposing", tasks: ["Adapt one asset across channels", "Resize tone/length per platform", "Keep message consistent"] }
      ],
      questions: [
        { q: "Who is the audience and what is the brand voice?", tag: "tone" },
        { q: "What are the hard brand rules or claims it must not make?", tag: "guardrail" },
        { q: "What does success look like (clicks, replies, signups)?", tag: "metric" }
      ],
      guardrails: ["No unverifiable claims, fake testimonials or guarantees", "Label AI-generated media where required; respect copyright"]
    },
    {
      id: "sales",
      name: "Sales & Outreach (SDR)",
      icon: "📣",
      blurb: "Researches prospects and drafts personalised outreach & follow-ups.",
      keywords: ["sales","sdr","outreach","prospect","lead","pipeline","crm","cold","email","follow up","qualify","demo","deal"],
      users: ["Sales reps", "Founders", "RevOps"],
      output: "Prospect summary · Angle · Drafted message · Suggested follow-up cadence",
      caps: [
        { name: "Prospect Research", tasks: ["Summarise the account & contact", "Find a relevant trigger / angle", "Note disqualifiers"] },
        { name: "Personalised Outreach", tasks: ["Draft a first-touch message", "Tie value to the prospect's context", "Keep it short with one clear CTA"] },
        { name: "Follow-up Sequencing", tasks: ["Plan a multi-touch cadence", "Vary angle per touch", "Know when to stop"] },
        { name: "Qualification", tasks: ["Score fit against ICP", "Ask qualifying questions", "Flag hot vs. nurture"] }
      ],
      questions: [
        { q: "Who is the ideal customer profile (ICP)?", tag: "scope" },
        { q: "What is the product's core value proposition?", tag: "context" },
        { q: "What CRM / data does it read and write?", tag: "knowledge" }
      ],
      guardrails: ["Respect anti-spam law and opt-outs; no misleading claims", "Never fabricate a prospect detail to personalise — omit if unknown"]
    },
    {
      id: "ops",
      name: "Operations & Automation",
      icon: "⚙️",
      blurb: "Runs a repeatable process end-to-end and hands off exceptions.",
      keywords: ["operations","ops","automate","automation","process","workflow","onboarding","fulfil","invoice","schedule","coordinate","admin","back office"],
      users: ["Ops team", "Founders", "Managers"],
      output: "Action taken · Result · Exceptions · What needs a human",
      caps: [
        { name: "Intake & Validation", tasks: ["Receive the request/trigger", "Validate required fields", "Reject/return incomplete inputs"] },
        { name: "Process Execution", tasks: ["Run the standard steps in order", "Update the systems of record", "Log each action"] },
        { name: "Exception Handling", tasks: ["Detect anything off the happy path", "Apply the documented rule or hold", "Escalate with full context"] },
        { name: "Reporting", tasks: ["Summarise throughput & exceptions", "Surface recurring blockers", "Suggest process fixes"] }
      ],
      questions: [
        { q: "What exact process should it run, step by step?", tag: "scope" },
        { q: "Which systems does it act in, and with what permissions?", tag: "tools" },
        { q: "What are the 'stop and ask a human' conditions?", tag: "escalation" }
      ],
      guardrails: ["Never take irreversible actions (payments, deletions, sends) without a confirmation gate", "Log every action for audit"]
    },
    {
      id: "compliance",
      name: "Compliance & Risk",
      icon: "🛡️",
      blurb: "Checks work against rules and flags risk — without giving legal sign-off.",
      keywords: ["compliance","regulat","risk","legal","policy","gdpr","audit","standard","governance","label","safety","conformity"],
      users: ["Compliance team", "Legal", "Operations"],
      output: "Status (pass/action) · Requirements per rule · Risk-ranked gaps · Must-verify list",
      caps: [
        { name: "Requirement Mapping", tasks: ["Identify applicable regimes per market", "List mandatory requirements", "Cite the regime for each"] },
        { name: "Conformity Check", tasks: ["Compare the item to requirements", "Return pass / action-needed", "Rank gaps by risk"] },
        { name: "Documentation Review", tasks: ["Check required records exist", "Flag missing declarations", "Note retention duties"] }
      ],
      questions: [
        { q: "Which markets / jurisdictions are in scope?", tag: "scope" },
        { q: "Which regulations or internal policies apply?", tag: "compliance" },
        { q: "Where is the source-of-truth for the rules it checks against?", tag: "knowledge" }
      ],
      guardrails: ["Flag and cite — never give final legal sign-off; name what a specialist must verify", "State when a rule is uncertain rather than guessing"]
    },
    {
      id: "data",
      name: "Data Analyst",
      icon: "📊",
      blurb: "Answers questions from data and explains the numbers.",
      keywords: ["data","analytics","metric","dashboard","sql","report","kpi","cohort","funnel","revenue","forecast","trend","query"],
      users: ["Leadership", "Product", "Growth"],
      output: "Answer · How it was calculated · Caveats · Recommended action",
      caps: [
        { name: "Question → Metric", tasks: ["Translate the question into a metric", "Confirm definitions & time window", "State assumptions"] },
        { name: "Analysis", tasks: ["Pull / compute the numbers", "Segment where it matters", "Sense-check for anomalies"] },
        { name: "Explanation", tasks: ["Explain what drives the number", "Show the calculation", "Flag data-quality caveats"] }
      ],
      questions: [
        { q: "What data sources / tables can it use?", tag: "knowledge" },
        { q: "What are the canonical metric definitions?", tag: "context" },
        { q: "Who reads the output and at what level of detail?", tag: "format" }
      ],
      guardrails: ["Never present an estimate as an exact figure; show the method", "Flag low-confidence or small-sample results"]
    },
    {
      id: "recruit",
      name: "Recruiting & Talent",
      icon: "🧑‍💼",
      blurb: "Screens candidates and drafts JD/outreach — fairly and consistently.",
      keywords: ["recruit","talent","candidate","hiring","screen","cv","resume","interview","job description","sourcing","applicant"],
      users: ["Recruiters", "Hiring managers"],
      output: "Summary · Fit vs. criteria · Strengths/risks · Recommended next step",
      caps: [
        { name: "JD & Criteria", tasks: ["Draft/clarify the role requirements", "Define must-have vs. nice-to-have", "Set objective screening criteria"] },
        { name: "Candidate Screening", tasks: ["Summarise the candidate", "Map evidence to each criterion", "Flag gaps to probe in interview"] },
        { name: "Outreach", tasks: ["Draft personalised candidate outreach", "Answer common candidate questions", "Schedule next steps"] }
      ],
      questions: [
        { q: "What is the role and its must-have criteria?", tag: "scope" },
        { q: "What fairness / bias rules must it follow?", tag: "guardrail" },
        { q: "What data can it see (CVs, ATS), and what must stay private?", tag: "knowledge" }
      ],
      guardrails: ["Score only on job-relevant, objective criteria; avoid protected characteristics", "Recommend, never auto-reject — a human decides"]
    },
    {
      id: "coding",
      name: "Coding / Engineering",
      icon: "💻",
      blurb: "Helps write, review and debug code within a codebase.",
      keywords: ["code","coding","engineer","developer","bug","debug","review","refactor","test","api","software","programming","pull request"],
      users: ["Engineers", "Tech leads"],
      output: "What changed · Why · How to verify · Risks",
      caps: [
        { name: "Understand & Plan", tasks: ["Read the relevant code & requirements", "Propose an approach before editing", "Call out risks & unknowns"] },
        { name: "Implement", tasks: ["Make focused changes matching conventions", "Keep diffs small & reviewable", "Update docs/types as needed"] },
        { name: "Verify", tasks: ["Add / run tests", "Exercise the change end-to-end", "Report results honestly"] },
        { name: "Review", tasks: ["Check for correctness & edge cases", "Flag security & performance issues", "Suggest simplifications"] }
      ],
      questions: [
        { q: "What stack / languages and conventions apply?", tag: "context" },
        { q: "What can it change vs. what is off-limits (prod, secrets)?", tag: "guardrail" },
        { q: "How is work verified (tests, CI, review)?", tag: "tools" }
      ],
      guardrails: ["Never commit secrets or run destructive/irreversible commands without confirmation", "Report failing tests honestly — don't claim done unverified"]
    },
    {
      id: "assistant",
      name: "Personal / Executive Assistant",
      icon: "🗓️",
      blurb: "Manages inbox, calendar and tasks; drafts on your behalf.",
      keywords: ["assistant","personal assistant","executive assistant","calendar","schedule","email","inbox","meeting","reminder","organise","triage"],
      users: ["The principal", "Their team"],
      output: "What it did / drafted · Options · What needs your decision",
      caps: [
        { name: "Inbox Triage", tasks: ["Categorise & prioritise messages", "Draft replies for approval", "Surface anything urgent"] },
        { name: "Scheduling", tasks: ["Find times across calendars", "Draft invites & agendas", "Handle reschedules"] },
        { name: "Task & Follow-up", tasks: ["Capture actions from threads", "Chase open items", "Prep briefings"] }
      ],
      questions: [
        { q: "What can it send / book autonomously vs. draft for approval?", tag: "guardrail" },
        { q: "What are the preferences (hours, tone, VIPs)?", tag: "tone" },
        { q: "Which accounts (mail, calendar) does it access?", tag: "tools" }
      ],
      guardrails: ["Draft-for-approval by default; never send externally or book without a rule/confirmation", "Protect private info; share only what's needed"]
    },
    {
      id: "legal",
      name: "Legal Assistant",
      icon: "⚖️",
      blurb: "Drafts and reviews documents and summarises clauses — not legal advice.",
      keywords: ["legal","contract","clause","nda","agreement","terms","review","draft","law","paralegal","compliance","dispute","liability"],
      users: ["Legal team", "Founders", "Operations"],
      output: "Summary · Key points / risks · Suggested edits · What a lawyer must confirm",
      caps: [
        { name: "Document Summary", tasks: ["Summarise the document in plain language", "Pull out key obligations & dates", "Flag unusual or one-sided terms"] },
        { name: "Clause Review", tasks: ["Compare clauses to a standard/playbook", "Flag risky or missing clauses", "Suggest redlines with rationale"] },
        { name: "Drafting from Template", tasks: ["Fill a template from the provided facts", "Mark placeholders needing input", "Note where bespoke drafting is required"] }
      ],
      questions: [
        { q: "What document types and jurisdictions are in scope?", tag: "scope" },
        { q: "Is there a clause playbook / standard position to compare against?", tag: "knowledge" },
        { q: "Who is the qualified lawyer that signs off?", tag: "escalation" }
      ],
      guardrails: ["Provide information, not legal advice — a qualified lawyer must review before reliance", "Never assert a clause is enforceable; flag for professional confirmation"]
    },
    {
      id: "finance",
      name: "Finance & Bookkeeping",
      icon: "💷",
      blurb: "Categorises transactions, drafts reports and answers finance questions.",
      keywords: ["finance","bookkeeping","accounting","invoice","expense","ledger","reconcile","budget","cashflow","tax","payroll","transaction","p&l"],
      users: ["Finance team", "Founders", "Bookkeeper"],
      output: "Answer / figures · How it was derived · Caveats · Needs human sign-off?",
      caps: [
        { name: "Transaction Categorisation", tasks: ["Classify transactions to the chart of accounts", "Flag ambiguous or unusual items", "Note anything needing a receipt"] },
        { name: "Reporting", tasks: ["Compile the requested summary (P&L, cashflow)", "Show the calculation & period", "Highlight variances vs. prior period"] },
        { name: "Query Answering", tasks: ["Answer finance questions from the records", "State assumptions & definitions", "Escalate anything tax-sensitive"] }
      ],
      questions: [
        { q: "What accounting system / chart of accounts does it use?", tag: "knowledge" },
        { q: "What can it do autonomously vs. flag for the accountant?", tag: "guardrail" },
        { q: "Which reporting periods and standards apply?", tag: "context" }
      ],
      guardrails: ["Never file, pay or submit anything without human approval", "Flag tax and regulatory matters for a qualified accountant; never present estimates as audited figures"]
    },
    {
      id: "hr",
      name: "HR & People Ops",
      icon: "🧑‍🤝‍🧑",
      blurb: "Answers policy questions and drafts people documents — fairly and privately.",
      keywords: ["hr","people","employee","policy","onboarding","leave","holiday","handbook","performance","grievance","benefits","staff","culture"],
      users: ["Employees", "Managers", "People team"],
      output: "Answer · Policy reference · Suggested next step · Escalate to HR?",
      caps: [
        { name: "Policy Q&A", tasks: ["Answer from the employee handbook", "Cite the relevant policy", "Say when a case needs a person"] },
        { name: "Onboarding Support", tasks: ["Guide a new joiner through steps", "Answer common first-week questions", "Surface who to contact"] },
        { name: "Document Drafting", tasks: ["Draft letters/notes from a template", "Keep tone consistent & fair", "Flag anything legally sensitive"] }
      ],
      questions: [
        { q: "What is the source-of-truth for policies (handbook, intranet)?", tag: "knowledge" },
        { q: "What topics must always route to a human (grievances, terminations)?", tag: "escalation" },
        { q: "What privacy rules govern employee data?", tag: "guardrail" }
      ],
      guardrails: ["Never make or imply employment decisions; escalate grievances, discipline and terminations to HR", "Handle personal data confidentially and lawfully"]
    },
    {
      id: "pm",
      name: "Project / Program Manager",
      icon: "📋",
      blurb: "Keeps a project on track: plans, status, risks and follow-ups.",
      keywords: ["project","program","project manager","timeline","milestone","stakeholder","deliverable","roadmap","gantt","sprint","critical path"],
      users: ["Project teams", "Stakeholders", "Leadership"],
      output: "Status (RAG) · Progress · Risks & blockers · Next actions & owners",
      caps: [
        { name: "Planning", tasks: ["Break the goal into milestones & tasks", "Assign owners and estimate durations", "Map dependencies & critical path"] },
        { name: "Status Reporting", tasks: ["Roll up progress to a RAG status", "Summarise for the audience level", "Surface what changed since last update"] },
        { name: "Risk & Follow-up", tasks: ["Track risks, issues & dependencies", "Chase open actions with owners", "Flag anything about to slip"] }
      ],
      questions: [
        { q: "What is the project goal, scope and deadline?", tag: "scope" },
        { q: "Who are the stakeholders and how often do they need updates?", tag: "context" },
        { q: "Where does it read/write project data (board, tracker)?", tag: "tools" }
      ],
      guardrails: ["Report status honestly — never mark something green to avoid friction", "Estimate durations as ranges; confirm commitments with owners"]
    },
    {
      id: "social",
      name: "Social Media Manager",
      icon: "📱",
      blurb: "Plans, drafts and repurposes on-brand social content across platforms.",
      keywords: ["social","instagram","linkedin","tiktok","twitter","post","content calendar","engagement","hashtag","community","reel","caption","platform"],
      users: ["Marketing", "Founders", "Community team"],
      output: "Post drafts · Platform variants · Posting notes · Suggested next test",
      caps: [
        { name: "Content Planning", tasks: ["Propose a content calendar to the goal", "Balance formats & themes", "Tie posts to campaigns/dates"] },
        { name: "Drafting", tasks: ["Write platform-native captions", "Suggest hooks & CTAs", "Recommend hashtags/format"] },
        { name: "Repurposing", tasks: ["Adapt one asset across platforms", "Resize tone/length per channel", "Keep the core message consistent"] }
      ],
      questions: [
        { q: "Which platforms, and what is the brand voice?", tag: "tone" },
        { q: "What are the goals (reach, engagement, signups)?", tag: "metric" },
        { q: "What claims or topics are off-limits?", tag: "guardrail" }
      ],
      guardrails: ["No unverifiable claims; disclose ads/partnerships per platform rules", "Respect copyright and platform policies; label synthetic media where required"]
    },
    {
      id: "product",
      name: "Product Manager",
      icon: "🧩",
      blurb: "Turns problems into specs: research, prioritisation and PRDs.",
      keywords: ["product","manager","feature","backlog","prioritis","roadmap","user story","prd","requirement","discovery","spec","metric","persona"],
      users: ["Product team", "Engineering", "Leadership"],
      output: "Problem · Options · Recommendation & rationale · Success metric · Next step",
      caps: [
        { name: "Discovery Synthesis", tasks: ["Summarise user feedback & research", "Identify the core problem & who has it", "Separate signal from noise"] },
        { name: "Prioritisation", tasks: ["Score ideas against a framework (RICE/value-effort)", "State assumptions & confidence", "Recommend what to do now vs. later"] },
        { name: "Spec Writing", tasks: ["Draft a PRD/user stories", "Define success metrics & acceptance criteria", "List open questions & risks"] }
      ],
      questions: [
        { q: "What outcome / metric is the product trying to move?", tag: "metric" },
        { q: "What research or data sources can it use?", tag: "knowledge" },
        { q: "What prioritisation framework does the team use?", tag: "context" }
      ],
      guardrails: ["Ground recommendations in evidence; flag assumptions vs. facts", "Never present opinion as validated user need"]
    },
    {
      id: "tutor",
      name: "Tutor / Trainer",
      icon: "🎓",
      blurb: "Teaches a topic and builds training material at the right level.",
      keywords: ["tutor","teach","train","training","course","learn","explain","lesson","onboarding","curriculum","quiz","coach","education","upskill"],
      users: ["Learners", "New hires", "Trainers"],
      output: "Explanation · Example · Check-for-understanding · Next step",
      caps: [
        { name: "Explain a Concept", tasks: ["Explain at the learner's level", "Use a concrete example/analogy", "Check understanding with a question"] },
        { name: "Build Learning Material", tasks: ["Draft a lesson/module to an objective", "Sequence from basics to advanced", "Add exercises & a quick assessment"] },
        { name: "Practice & Feedback", tasks: ["Pose practice questions", "Give specific, kind feedback", "Adapt difficulty to responses"] }
      ],
      questions: [
        { q: "What topic, and what is the learner's starting level?", tag: "scope" },
        { q: "What is the learning objective / how is success measured?", tag: "metric" },
        { q: "Any required source material or house style?", tag: "knowledge" }
      ],
      guardrails: ["Never present uncertain facts as certain; cite sources for specifics", "Encourage understanding over answers; don't just do the learner's work"]
    },
    {
      id: "procurement",
      name: "Procurement / Sourcing",
      icon: "🛒",
      blurb: "Runs sourcing: specs to RFQs, supplier comparison and negotiation prep.",
      keywords: ["procurement","sourcing","purchasing","supplier","vendor","rfq","rfp","quote","negotiat","moq","lead time","tender","contract","spend"],
      users: ["Procurement", "Operations", "Founders"],
      output: "Summary · Options compared · Recommendation & rationale · Next actions",
      caps: [
        { name: "Requirement & RFQ", tasks: ["Turn the need into a clear spec", "Draft the RFQ with volumes & terms", "Define selection criteria & weights"] },
        { name: "Supplier Comparison", tasks: ["Normalise quotes to like-for-like landed cost", "Score suppliers against the criteria", "Flag risks (single-source, lead time)"] },
        { name: "Negotiation Prep", tasks: ["Identify levers (volume, term, spec)", "Set target & walk-away positions", "Draft the negotiation brief"] }
      ],
      questions: [
        { q: "What category / spec is being sourced, and at what volume?", tag: "scope" },
        { q: "What matters most — price, lead time, quality, sustainability?", tag: "metric" },
        { q: "What certifications or terms are mandatory?", tag: "compliance" }
      ],
      guardrails: ["Never invent supplier names, prices or quotes — compare only real inputs", "Flag conflicts of interest and mandatory compliance checks"]
    },
    {
      id: "footwear",
      name: "Footwear / Shoemaker",
      icon: "👞",
      blurb: "Deep shoemaking expertise: materials, design, construction, production & QC across all shoe types.",
      keywords: ["shoe","shoes","shoemaker","footwear","cobbler","cordwainer","boot","sneaker","sole","outsole","insole","last","welt","heel","upper","lasting","clicking","goodyear"],
      users: ["Footwear brands", "Designers", "Production managers", "Factories / makers"],
      output: "Summary · Options / recommendation · Materials & construction notes · Cost & quality impact · Next actions",
      caps: [
        { name: "Materials & Components", tasks: ["Select uppers for the use case (full-grain/suede leather, textile, knit, synthetic)", "Spec soling (rubber, TPU, EVA, leather), insoles, linings, adhesives, threads & hardware", "Balance performance, cost, sustainability and sourcing / MOQ"] },
        { name: "Design & Last Development", tasks: ["Advise on last shape, fit and size grading", "Develop the style across shoe types (dress, boot, sneaker, sandal, loafer, heel, moccasin)", "Turn a concept into a tech pack / specification"] },
        { name: "Construction Methods", tasks: ["Recommend a construction (cement, Goodyear welt, Blake / Blake-rapid, vulcanised, strobel, stitchdown, moccasin)", "Trade off durability, repairability, flexibility, cost and factory capability", "Flag what each construction demands of materials & tooling"] },
        { name: "Production & Process", tasks: ["Map the flow: clicking/cutting → closing/stitching → lasting → bottoming → finishing", "Define operations, tooling (dies, lasts, moulds) and line layout", "Identify bottlenecks and cycle times"] },
        { name: "Labour & Line Planning", tasks: ["Estimate operations and skill level per step", "Plan line balancing and output per day", "Advise where hand-work vs. automation fits"] },
        { name: "Quality Control", tasks: ["Set QC checkpoints and AQL", "Define tests (flex, bond/peel strength, abrasion, colourfastness, fit/wear trial)", "Diagnose defects (sole separation, bond failure, creasing, poor fit) and corrective actions"] },
        { name: "Costing & Project Management", tasks: ["Build a bill of materials + labour cost to a target FOB", "Plan the development calendar (concept → sampling → fit → confirmation → production)", "Track the critical path, long-lead tooling and supplier milestones"] }
      ],
      questions: [
        { q: "What shoe type(s) and use case — dress, athletic, work/safety, casual, kids?", tag: "scope" },
        { q: "What volume, target FOB / retail price, and target markets?", tag: "context" },
        { q: "What factory & construction capabilities are available, and any brand / material / sustainability requirements?", tag: "knowledge" }
      ],
      guardrails: ["Recommend physical testing (flex, bond strength, wear trials) before committing a material or construction — never assert durability unverified", "Give material/cost figures as ranges and flag estimates; real FOB comes from the factory quote"]
    },
    {
      id: "apparel",
      name: "Fashion / Apparel Designer",
      icon: "🧵",
      blurb: "Garment design through to production: materials, fit, construction and tech packs.",
      keywords: ["apparel","garment","clothing","fashion","sewing","seamstress","pattern","tailoring","fabric","collection","stitch","seam","grading"],
      users: ["Fashion brands", "Designers", "Garment factories"],
      output: "Summary · Options / recommendation · Materials & construction notes · Cost & quality impact · Next actions",
      caps: [
        { name: "Design & Range", tasks: ["Develop styles to the brief & season", "Balance the range across price and use", "Turn concepts into tech packs"] },
        { name: "Materials & Fit", tasks: ["Select fabrics, trims & interlinings", "Advise on fit, grading and size sets", "Flag drape, stretch & care implications"] },
        { name: "Construction & Production", tasks: ["Specify seams, stitching & finishes", "Map cut → sew → finish operations", "Plan sampling and QC checkpoints"] }
      ],
      questions: [
        { q: "What garment type(s), season and target customer?", tag: "scope" },
        { q: "What volume, target cost and markets?", tag: "context" },
        { q: "Any brand fabric / sustainability / labelling requirements?", tag: "knowledge" }
      ],
      guardrails: ["Recommend fit and wash/wear testing before bulk — never assert fit or durability unverified", "Give cost figures as ranges; real prices come from the factory quote"]
    },
    {
      id: "furniture",
      name: "Furniture / Cabinet Maker",
      icon: "🪑",
      blurb: "Designs and specs furniture: timber, joinery, construction and production.",
      keywords: ["furniture","cabinet","woodwork","joinery","carpentry","joiner","timber","cabinetry","veneer","dovetail","upholstery"],
      users: ["Furniture brands", "Makers / workshops", "Interior clients"],
      output: "Summary · Options / recommendation · Materials & joinery notes · Cost & quality impact · Next actions",
      caps: [
        { name: "Design & Materials", tasks: ["Advise on timber / board / veneer for the piece", "Balance strength, weight, cost and finish", "Turn a concept into a cut list & drawing"] },
        { name: "Joinery & Construction", tasks: ["Recommend joints (dovetail, mortise & tenon, dowel, domino)", "Trade off strength, cost and repairability", "Specify hardware, finish and fixings"] },
        { name: "Production & QC", tasks: ["Map cutting → machining → assembly → finishing", "Plan tooling, jigs and batch flow", "Set QC checks (fit, finish, stability)"] }
      ],
      questions: [
        { q: "What piece(s), style and intended use?", tag: "scope" },
        { q: "One-off / batch / production volume, and budget?", tag: "context" },
        { q: "Any material, sustainability (e.g. FSC) or fire requirements?", tag: "compliance" }
      ],
      guardrails: ["Recommend a prototype and load/stability testing before batch — don't assert strength unverified", "Give cost/timber figures as ranges and flag estimates"]
    },
    {
      id: "jeweller",
      name: "Jeweller / Goldsmith",
      icon: "💍",
      blurb: "Designs and makes jewellery: metals, stones, setting and production methods.",
      keywords: ["jewel","jewellery","jewelry","goldsmith","silversmith","ring","gemstone","gem","precious metal","setting","casting","hallmark","carat"],
      users: ["Jewellery brands", "Bench jewellers", "Private clients"],
      output: "Summary · Options / recommendation · Materials & method notes · Cost & quality impact · Next actions",
      caps: [
        { name: "Design & Materials", tasks: ["Advise on metal (gold karat, silver, platinum) & finish", "Select and grade stones (cut, clarity, colour, carat)", "Turn a concept into a CAD / bench spec"] },
        { name: "Making & Setting", tasks: ["Recommend method (fabrication, lost-wax casting, CAD/CAM)", "Advise setting type (claw, bezel, pavé, channel)", "Flag durability & wear considerations"] },
        { name: "Production & Compliance", tasks: ["Plan sampling and batch production", "Set QC (stone security, finish, weight)", "Cover hallmarking & metal compliance"] }
      ],
      questions: [
        { q: "What piece(s) and style, and any stones involved?", tag: "scope" },
        { q: "One-off / batch volume, and target price / metal budget?", tag: "context" },
        { q: "Which markets (drives hallmarking & metal standards)?", tag: "compliance" }
      ],
      guardrails: ["Never certify stone authenticity or value — recommend an independent gemmologist / assay", "Give metal/stone costs as ranges; flag hallmarking requirements per market"]
    },
    {
      id: "leathergoods",
      name: "Leather Goods Maker",
      icon: "👜",
      blurb: "Designs and makes bags & accessories: leather, hardware, construction and QC.",
      keywords: ["handbag","bag","wallet","belt","leather goods","saddler","leatherwork","tannery","stitching","edge paint","accessory"],
      users: ["Accessory brands", "Leather workshops", "Designers"],
      output: "Summary · Options / recommendation · Materials & construction notes · Cost & quality impact · Next actions",
      caps: [
        { name: "Materials & Hardware", tasks: ["Select leather (tannage, weight, finish) & linings", "Spec hardware, zips, thread & adhesives", "Balance look, durability, cost and sourcing"] },
        { name: "Design & Construction", tasks: ["Develop the pattern & structure", "Recommend construction (turned edge, raw/painted edge, piped)", "Turn a concept into a spec / tech pack"] },
        { name: "Production & QC", tasks: ["Map clicking → skiving → stitching → finishing", "Plan sampling and tooling (clicker dies)", "Set QC (stitching, edge finish, hardware pull)"] }
      ],
      questions: [
        { q: "What item(s) and positioning (luxury, mid, functional)?", tag: "scope" },
        { q: "Volume, target cost and markets?", tag: "context" },
        { q: "Any material / traceability / sustainability requirements?", tag: "knowledge" }
      ],
      guardrails: ["Recommend wear and hardware-pull testing before bulk — don't assert durability unverified", "Give cost figures as ranges; real prices come from the maker's quote"]
    },
    {
      id: "industrial",
      name: "Industrial / Product Designer",
      icon: "🛠️",
      blurb: "Designs physical products for manufacture: materials, DFM, prototyping and tooling.",
      keywords: ["industrial design","product design","prototype","cad","injection","tooling","ergonomic","dfm","3d printing","mould","enclosure","manufactur"],
      users: ["Hardware startups", "Product teams", "Manufacturers"],
      output: "Summary · Options / recommendation · Materials & DFM notes · Cost & tooling impact · Next actions",
      caps: [
        { name: "Concept & Materials", tasks: ["Develop concepts to the brief & ergonomics", "Select materials & processes (injection, sheet metal, cast)", "Turn a concept into CAD / a spec"] },
        { name: "Design for Manufacture", tasks: ["Review parts for DFM/DFA", "Advise on tolerances, draft & wall thickness", "Flag tooling cost & lead-time drivers"] },
        { name: "Prototyping & Validation", tasks: ["Plan prototype stages (3D print → tooling)", "Define tests (fit, function, drop, safety)", "Set QC and first-article inspection"] }
      ],
      questions: [
        { q: "What product, and what problem/ergonomics must it solve?", tag: "scope" },
        { q: "Volume, target unit cost and tooling budget?", tag: "context" },
        { q: "Which markets & safety standards apply?", tag: "compliance" }
      ],
      guardrails: ["Recommend prototyping and safety testing before tooling — never assert it works unverified", "Give cost/tooling figures as ranges and flag estimates"]
    },
    {
      id: "chef",
      name: "Chef / Culinary Development",
      icon: "🍳",
      blurb: "Develops recipes and menus: ingredients, method, costing and kitchen production.",
      keywords: ["chef","culinary","recipe","menu","kitchen","cooking","food","cuisine","dish","restaurant","pastry","catering"],
      users: ["Restaurants", "Food brands", "Caterers"],
      output: "Summary · Options / recommendation · Ingredients & method notes · Cost & yield impact · Next actions",
      caps: [
        { name: "Recipe Development", tasks: ["Develop dishes to the brief, cuisine & dietary needs", "Balance flavour, texture and presentation", "Write the method with quantities & yields"] },
        { name: "Menu & Costing", tasks: ["Design a coherent menu to a price point", "Cost recipes and compute margin / GP%", "Flag allergens and dietary labelling"] },
        { name: "Kitchen Production", tasks: ["Plan prep, mise en place and service flow", "Advise on scaling and consistency", "Set food-safety (HACCP) checkpoints"] }
      ],
      questions: [
        { q: "What cuisine / concept and service style?", tag: "scope" },
        { q: "Target price point, covers/volume and dietary needs?", tag: "context" },
        { q: "Kitchen equipment, skill level and food-safety regime?", tag: "compliance" }
      ],
      guardrails: ["Always surface allergens; never omit a known allergen or dietary risk", "Flag food-safety (HACCP) requirements — a person owns compliance sign-off"]
    },
    {
      id: "interior",
      name: "Interior Designer",
      icon: "🛋️",
      blurb: "Designs interior spaces: layout, materials, lighting and specification.",
      keywords: ["interior design","interior","decor","furnishing","space plan","fit-out","room","mood board","lighting","flooring","joinery"],
      users: ["Homeowners", "Developers", "Commercial clients"],
      output: "Summary · Concept / options · Materials & spec notes · Cost & timeline impact · Next actions",
      caps: [
        { name: "Concept & Space Planning", tasks: ["Develop a concept to the brief & budget", "Plan layout, flow and zoning", "Produce mood boards / visuals"] },
        { name: "Materials & Specification", tasks: ["Select finishes, furniture, lighting & FF&E", "Balance look, durability, cost and lead time", "Compile a spec / schedule"] },
        { name: "Delivery", tasks: ["Plan the phases and trades", "Track budget, long-lead items and installs", "Flag building/fire/access compliance"] }
      ],
      questions: [
        { q: "What space, style and how will it be used?", tag: "scope" },
        { q: "Budget, timeline and any fixed constraints?", tag: "context" },
        { q: "Any building / fire / accessibility requirements?", tag: "compliance" }
      ],
      guardrails: ["Flag structural, electrical and fire matters for a qualified professional — don't sign them off", "Give cost/lead-time figures as ranges; confirm with suppliers & trades"]
    }
  ];

  const UNIVERSAL_QUESTIONS = [
    { q: "Who exactly are the users, and what do they need from it?", tag: "users" },
    { q: "What is explicitly OUT of scope?", tag: "scope" },
    { q: "What does a great outcome look like (the success metric)?", tag: "metric" },
    { q: "What must it NEVER do (hard guardrails)?", tag: "guardrail" }
  ];

  const OPTIONS = [
    { key: "outputContract", label: "Consistent output contract", desc: "Every answer follows the same structure — reads as one agent." },
    { key: "clarify", label: "Ask before assuming", desc: "Agent asks for missing inputs instead of guessing." },
    { key: "guardrails", label: "Guardrails & safety", desc: "No fabrication, scope limits, human escalation, data care." },
    { key: "knowledge", label: "Knowledge grounding", desc: "Wire it to real sources (docs / SharePoint / KB) and cite them." },
    { key: "fewshot", label: "Worked examples (few-shot)", desc: "Embed 1 example per capability to lock output quality." },
    { key: "tools", label: "Tools / integrations", desc: "Declare the systems & actions it may use." },
    { key: "evals", label: "Evaluation test cases", desc: "Ship test prompts + expected behaviour to catch regressions." },
    { key: "escalation", label: "Escalation path", desc: "Define when and how it hands off to a human." }
  ];

  const DEPLOY = [
    { key: "copilot", label: "Microsoft Copilot Studio" },
    { key: "claude", label: "Claude (Project / API)" },
    { key: "gpt", label: "Custom GPT" }
  ];

  const STEPS = [
    { t: "Objective", s: "What & why" },
    { t: "Identity", s: "Who it is" },
    { t: "Capabilities", s: "Tasks it performs" },
    { t: "Questions", s: "Fill the gaps" },
    { t: "Best practices", s: "Options" },
    { t: "Review", s: "Generate" }
  ];

  /* ===================== State ===================== */
  const LS_KEY = "architect.blueprint.v1";
  const blank = () => ({
    name: "", objective: "", jd: "", archetypeId: null,
    role: "", users: [], domain: "", deploy: "copilot",
    capabilities: [], questions: [],
    options: { outputContract: true, clarify: true, guardrails: true, knowledge: true, fewshot: true, tools: false, evals: true, escalation: true },
    step: 0
  });
  let state = load() || blank();

  function load() { try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { return null; } }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    el("saveState").textContent = "Saving…";
    saveTimer = setTimeout(function () {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      el("saveState").textContent = "Saved";
    }, 300);
  }

  /* ===================== Helpers ===================== */
  function el(id) { return document.getElementById(id); }
  function ce(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return (s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
  function archetype() { return ARCHETYPES.find(a => a.id === state.archetypeId) || null; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ===================== Suggestion engine ===================== */
  function scoreArchetypes() {
    const text = (state.objective + " " + state.jd).toLowerCase();
    if (!text.trim()) return [];
    const wordHit = (w) => new RegExp("\\b" + w).test(text); // leading word boundary
    return ARCHETYPES.map(a => {
      let hits = 0;
      a.keywords.forEach(k => {
        if (/^[a-z0-9]+$/.test(k)) {
          // single word: leading boundary (matches plurals/suffixes, avoids
          // false positives like "ring" inside "manufacturing")
          if (wordHit(k)) hits++;
        } else if (text.indexOf(k) !== -1) {
          hits++; // phrase / punctuation: substring match
        }
      });
      // strongly weight the archetype's own name words — the clearest signal,
      // so a distinctive name term beats incidental keyword noise
      a.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4).forEach(w => {
        if (wordHit(w)) hits += 1;
      });
      return { a, hits };
    }).filter(x => x.hits > 0).sort((x, y) => y.hits - x.hits);
  }

  function seedFromArchetype(force) {
    const a = archetype(); if (!a) return;
    if (force || !state.capabilities.length) state.capabilities = clone(a.caps);
    if (force || !state.questions.length) {
      const qs = a.questions.concat(UNIVERSAL_QUESTIONS);
      state.questions = qs.map((q, i) => ({ id: "q" + i, q: q.q, tag: q.tag, answer: "" }));
    }
    if (force || !state.role) { var an = /^[aeiou]/i.test(a.name) ? "An " : "A "; state.role = an + a.name.toLowerCase() + " agent"; }
    if (force || !state.users.length) state.users = a.users.slice();
  }

  // Extract candidate capabilities from a pasted JD (bulleted / line responsibilities)
  function capsFromJD() {
    const lines = state.jd.split(/\n+/).map(l => l.replace(/^[\s\-•*•·]+/, "").trim()).filter(Boolean);
    const verbs = /^(manage|develop|assess|review|evaluate|create|produce|analy|coordinat|source|negotiat|check|ensure|design|build|research|write|draft|support|resolve|monitor|report|optimis|optimize|identif|recommend|troubleshoot|test|screen|schedule)/i;
    const picked = lines.filter(l => l.length > 8 && l.length < 90 && verbs.test(l)).slice(0, 6);
    return picked.map(l => ({ name: l.charAt(0).toUpperCase() + l.slice(1), tasks: [] }));
  }

  /* ===================== Rendering ===================== */
  function render() {
    el("agentName").value = state.name;
    renderRail();
    renderStep();
    const pct = Math.round(((state.step + 1) / STEPS.length) * 100);
    el("progressBar").style.width = pct + "%";
    el("progressText").textContent = "Step " + (state.step + 1) + " of " + STEPS.length;
    el("backBtn").disabled = state.step === 0;
    el("nextBtn").textContent = state.step === STEPS.length - 1 ? "⤓ Generate" : "Next →";
    save();
  }

  function renderRail() {
    const rail = el("stepRail"); rail.innerHTML = "";
    STEPS.forEach((st, i) => {
      const li = ce("li", (i === state.step ? "active " : "") + (i < state.step ? "done" : ""));
      li.appendChild(ce("span", "num", i < state.step ? "✓" : String(i + 1)));
      const lab = ce("span", "step-label");
      lab.appendChild(ce("b", null, st.t));
      lab.appendChild(ce("small", null, st.s));
      li.appendChild(lab);
      li.onclick = () => { state.step = i; render(); };
      rail.appendChild(li);
    });
  }

  function renderStep() {
    const c = el("stepContent"); c.innerHTML = "";
    [step0, step1, step2, step3, step4, step5][state.step](c);
  }

  /* ---- Step 0: Objective ---- */
  function step0(c) {
    c.appendChild(ce("h2", null, "What should this agent achieve?"));
    c.appendChild(ce("p", "lead", "Describe the objective, and/or paste a job description. Architect suggests the right kind of agent from it."));

    const f1 = ce("div", "field");
    f1.appendChild(ce("label", null, "Objective"));
    f1.appendChild(ce("div", "help", "One or two sentences on what you want it to do and for whom."));
    const ta1 = ce("textarea"); ta1.placeholder = "e.g. Help our packaging team review specs, cut cost, stay compliant and troubleshoot failures.";
    ta1.value = state.objective; ta1.oninput = () => { state.objective = ta1.value; save(); };
    f1.appendChild(ta1); c.appendChild(f1);

    const f2 = ce("div", "field");
    f2.appendChild(ce("label", null, "Job description (optional)"));
    f2.appendChild(ce("div", "help", "Paste a JD — Architect can lift capabilities straight from its responsibilities."));
    const ta2 = ce("textarea"); ta2.style.minHeight = "120px"; ta2.placeholder = "Paste the role's responsibilities here…";
    ta2.value = state.jd; ta2.oninput = () => { state.jd = ta2.value; save(); };
    f2.appendChild(ta2); c.appendChild(f2);

    const btn = ce("button", "tool tool-primary inline-btn", "✦ Suggest an agent");
    btn.onclick = () => { renderSuggestions(sugWrap); };
    c.appendChild(btn);

    const sugWrap = ce("div"); sugWrap.style.marginTop = "16px"; c.appendChild(sugWrap);
    if (state.objective || state.jd) renderSuggestions(sugWrap);
  }

  function renderSuggestions(wrap) {
    wrap.innerHTML = "";
    const scored = scoreArchetypes();
    if (!scored.length) {
      wrap.appendChild(ce("div", "hintbox", "Type an objective or paste a JD above, then press <b>Suggest an agent</b>. Or pick any archetype below."));
    } else {
      wrap.appendChild(ce("div", "hintbox", "Best matches for your objective — pick one to seed the build (you can change everything later)."));
    }
    const list = scored.length ? scored.map(s => s.a) : ARCHETYPES;
    const maxHits = scored.length ? scored[0].hits : 0;
    const grid = ce("div", "suggests");
    list.forEach(a => {
      const card = ce("div", "sug" + (state.archetypeId === a.id ? " picked" : ""));
      const sc = scored.find(s => s.a.id === a.id);
      if (sc && maxHits) card.appendChild(ce("span", "match", Math.round((sc.hits / maxHits) * 100) + "% match"));
      card.appendChild(ce("div", "ico", a.icon));
      card.appendChild(ce("h4", null, esc(a.name)));
      card.appendChild(ce("p", null, esc(a.blurb)));
      card.onclick = () => {
        state.archetypeId = a.id;
        if (!state.name) state.name = "";
        seedFromArchetype(true);
        render();
      };
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
  }

  /* ---- Step 1: Identity ---- */
  function step1(c) {
    c.appendChild(ce("h2", null, "Agent identity"));
    c.appendChild(ce("p", "lead", "Give it a name, a one-line role, its users and where it will run."));
    const a = archetype();
    if (a) c.appendChild(ce("div", "hintbox", "Based on <b>" + esc(a.name) + "</b>. Output contract it will use: <b>" + esc(a.output) + "</b>"));

    field(c, "Agent name", "agentNameField", state.name, "e.g. PackPro AI", v => state.name = v);
    field(c, "One-line role / purpose", null, state.role, "A senior packaging consultant that…", v => state.role = v);
    field(c, "Domain / industry", null, state.domain, "e.g. FMCG packaging (personal care & food)", v => state.domain = v);

    const uf = ce("div", "field");
    uf.appendChild(ce("label", null, "Users (comma-separated)"));
    const ui = ce("input"); ui.type = "text"; ui.value = state.users.join(", ");
    ui.placeholder = "Packaging engineers, Procurement, Brand owners";
    ui.oninput = () => { state.users = ui.value.split(",").map(s => s.trim()).filter(Boolean); save(); };
    uf.appendChild(ui); c.appendChild(uf);

    const df = ce("div", "field");
    df.appendChild(ce("label", null, "Deploy to"));
    df.appendChild(ce("div", "help", "Tailors the setup instructions in the exported spec."));
    const row = ce("div", "choice-row");
    DEPLOY.forEach(d => {
      const ch = ce("button", "choice" + (state.deploy === d.key ? " on" : ""), d.label);
      ch.onclick = () => { state.deploy = d.key; render(); };
      row.appendChild(ch);
    });
    df.appendChild(row); c.appendChild(df);
  }

  function field(c, label, id, val, ph, onset) {
    const f = ce("div", "field");
    f.appendChild(ce("label", null, label));
    const i = ce("input"); i.type = "text"; if (id) i.id = id; i.value = val || ""; i.placeholder = ph || "";
    i.oninput = () => { onset(i.value); save(); if (id === "agentNameField") el("agentName").value = i.value; };
    f.appendChild(i); c.appendChild(f);
  }

  /* ---- Step 2: Capabilities ---- */
  function step2(c) {
    c.appendChild(ce("h2", null, "Capabilities & estimated tasks"));
    c.appendChild(ce("p", "lead", "Each capability is one skill the agent performs, broken into the tasks it runs. Edit freely."));

    const bar = ce("div", "choice-row"); bar.style.marginBottom = "14px";
    const b1 = ce("button", "tool", "↺ Reseed from archetype");
    b1.onclick = () => { seedFromArchetype(true); render(); };
    const b2 = ce("button", "tool", "＋ Lift from job description");
    b2.onclick = () => { capsFromJD().forEach(cp => state.capabilities.push(cp)); render(); };
    const b3 = ce("button", "tool", "＋ Blank capability");
    b3.onclick = () => { state.capabilities.push({ name: "", tasks: [] }); render(); };
    bar.appendChild(b1); if (state.jd.trim()) bar.appendChild(b2); bar.appendChild(b3);
    c.appendChild(bar);

    const list = ce("div", "cap-list");
    state.capabilities.forEach((cap, ci) => {
      const box = ce("div", "cap");
      const head = ce("div", "cap-head");
      const ni = ce("input"); ni.type = "text"; ni.value = cap.name; ni.placeholder = "Capability name";
      ni.oninput = () => { cap.name = ni.value; save(); };
      head.appendChild(ce("span", "muted", "#" + (ci + 1)));
      head.appendChild(ni);
      const del = ce("button", "mini danger", "✕");
      del.onclick = () => { state.capabilities.splice(ci, 1); render(); };
      head.appendChild(del);
      box.appendChild(head);

      const tasks = ce("div", "tasks");
      cap.tasks.forEach((t, ti) => {
        const tr = ce("div", "task-row");
        tr.appendChild(ce("span", "dot", "•"));
        const ti2 = ce("input"); ti2.type = "text"; ti2.value = t; ti2.placeholder = "Task…";
        ti2.oninput = () => { cap.tasks[ti] = ti2.value; save(); };
        tr.appendChild(ti2);
        const dx = ce("button", "mini danger", "✕");
        dx.onclick = () => { cap.tasks.splice(ti, 1); render(); };
        tr.appendChild(dx);
        tasks.appendChild(tr);
      });
      const addT = ce("button", "mini add-line", "＋ task");
      addT.onclick = () => { cap.tasks.push(""); render(); };
      tasks.appendChild(addT);
      box.appendChild(tasks);
      list.appendChild(box);
    });
    if (!state.capabilities.length) list.appendChild(ce("div", "hintbox", "No capabilities yet — reseed from the archetype, lift from a JD, or add a blank one."));
    c.appendChild(list);
  }

  /* ---- Step 3: Questions ---- */
  function step3(c) {
    c.appendChild(ce("h2", null, "Clarifying questions"));
    c.appendChild(ce("p", "lead", "These are the gaps a good build needs closed. Answer what you can — blanks become questions the agent asks up front, and prompts Claude to ask you when you run the Architect prompt."));

    const bar = ce("div", "choice-row"); bar.style.marginBottom = "14px";
    const add = ce("button", "tool", "＋ Add a question");
    add.onclick = () => { state.questions.push({ id: "q" + Date.now(), q: "", tag: "custom", answer: "" }); render(); };
    bar.appendChild(add); c.appendChild(bar);

    const list = ce("div", "q-list");
    state.questions.forEach((q, qi) => {
      const box = ce("div", "q");
      const lab = ce("label", null, esc(q.q || "New question") + (q.tag ? "<span class='tagq'>" + esc(q.tag) + "</span>" : ""));
      box.appendChild(lab);
      if (!q.q) {
        const qin = ce("input"); qin.type = "text"; qin.placeholder = "Type the question…"; qin.value = q.q;
        qin.oninput = () => { q.q = qin.value; save(); };
        qin.onblur = () => render();
        box.appendChild(qin);
      }
      const ans = ce("textarea"); ans.style.minHeight = "60px"; ans.placeholder = "Your answer (optional)…";
      ans.value = q.answer; ans.oninput = () => { q.answer = ans.value; save(); };
      box.appendChild(ans);
      const del = ce("button", "mini danger", "✕ remove"); del.style.marginTop = "8px";
      del.onclick = () => { state.questions.splice(qi, 1); render(); };
      box.appendChild(del);
      list.appendChild(box);
    });
    c.appendChild(list);
  }

  /* ---- Step 4: Best practices ---- */
  function step4(c) {
    c.appendChild(ce("h2", null, "Best-practice options"));
    c.appendChild(ce("p", "lead", "These bake proven agent-design patterns into the generated spec. Leave them on unless you have a reason not to."));
    const grid = ce("div", "opts");
    OPTIONS.forEach(o => {
      const on = !!state.options[o.key];
      const lab = ce("label", "opt" + (on ? " on" : ""));
      const cb = ce("input"); cb.type = "checkbox"; cb.checked = on;
      cb.onchange = () => { state.options[o.key] = cb.checked; render(); };
      lab.appendChild(cb);
      const ot = ce("div", "ot");
      ot.appendChild(ce("b", null, o.label));
      ot.appendChild(ce("small", null, o.desc));
      lab.appendChild(ot);
      grid.appendChild(lab);
    });
    c.appendChild(grid);
  }

  /* ---- Step 5: Review ---- */
  function step5(c) {
    c.appendChild(ce("h2", null, "Review & generate"));
    c.appendChild(ce("p", "lead", "Check the blueprint, then Generate. You'll get the agent spec, an Architect prompt to run in your own Claude/Copilot, and a saveable JSON."));
    const a = archetype();
    const grid = ce("div", "review-grid");

    const r1 = ce("div", "rc");
    r1.appendChild(ce("h4", null, "Agent"));
    r1.appendChild(ce("div", "v", "<b>" + esc(state.name || "(unnamed)") + "</b> — " + esc(state.role || "no role set") +
      "<br><span class='muted'>" + (a ? esc(a.name) : "no archetype") + " · deploy to " + esc(deployLabel()) + "</span>"));
    grid.appendChild(r1);

    const r2 = ce("div", "rc");
    r2.appendChild(ce("h4", null, "Capabilities (" + state.capabilities.length + ")"));
    const ul = ce("ul");
    state.capabilities.forEach(cp => ul.appendChild(ce("li", null, esc(cp.name || "(unnamed)") + " <span class='muted'>· " + cp.tasks.filter(Boolean).length + " tasks</span>")));
    if (!state.capabilities.length) ul.appendChild(ce("li", "muted", "none"));
    r2.appendChild(ul); grid.appendChild(r2);

    const answered = state.questions.filter(q => q.answer.trim()).length;
    const r3 = ce("div", "rc");
    r3.appendChild(ce("h4", null, "Questions"));
    r3.appendChild(ce("div", "v", answered + " of " + state.questions.length + " answered. <span class='muted'>Unanswered ones become up-front questions in the spec.</span>"));
    grid.appendChild(r3);

    const r4 = ce("div", "rc");
    r4.appendChild(ce("h4", null, "Best practices on"));
    const on = OPTIONS.filter(o => state.options[o.key]).map(o => o.label);
    r4.appendChild(ce("div", "v", on.length ? esc(on.join(" · ")) : "<span class='muted'>none</span>"));
    grid.appendChild(r4);

    c.appendChild(grid);
    const warn = [];
    if (!state.name) warn.push("no agent name");
    if (!state.capabilities.length) warn.push("no capabilities");
    if (warn.length) c.appendChild(ce("div", "hintbox", "Heads up: " + esc(warn.join(", ")) + ". You can still generate."));
  }

  function deployLabel() { const d = DEPLOY.find(x => x.key === state.deploy); return d ? d.label : state.deploy; }

  /* ===================== Generation ===================== */
  function fence(lines) { return ["```"].concat(lines, ["```"]).join("\n"); }

  function outputContract() {
    const a = archetype();
    return a ? a.output : "Summary · Details · Recommendations · Confidence & caveats · Next steps";
  }

  function guardrailList() {
    const g = [
      "Stay in scope — decline politely and hand off when a request is outside the agent's remit.",
      "Never fabricate facts, figures, sources, names or quotes. If unknown, say so.",
      "Flag decisions with legal, financial or safety impact for human verification; do not give final sign-off.",
      "Protect sensitive data (PII / secrets) — request and expose only what's needed.",
      "Be transparent that it's an AI and escalate edge cases to a human."
    ];
    const a = archetype();
    if (a) a.guardrails.forEach(x => { if (g.indexOf(x) === -1) g.push(x); });
    return g;
  }

  function triggersFor(name) {
    const n = (name || "this").replace(/[^\w\s/&-]/g, "").trim();
    const low = n.toLowerCase();
    return ['"' + n + '"', '"Help with ' + low + '"', '"Run ' + low + '"'];
  }

  // The deliverable: a production-ready agent spec (markdown)
  function genSpec() {
    const o = state.options, a = archetype();
    const L = [];
    L.push("# " + (state.name || "Untitled Agent") + " — Agent Spec");
    L.push("");
    L.push("> " + (state.role || "An AI agent.") + (state.domain ? "  Domain: " + state.domain + "." : ""));
    L.push("> Generated by Architect. Paste into " + deployLabel() + " (and portable to any LLM).");
    L.push("");
    if (state.objective) { L.push("**Objective.** " + state.objective); L.push(""); }
    if (state.users.length) { L.push("**Users.** " + state.users.join(" · ")); L.push(""); }

    // Answered context
    const answered = state.questions.filter(q => q.answer.trim());
    if (answered.length) {
      L.push("## Context (from discovery)");
      L.push("");
      answered.forEach(q => L.push("- **" + q.q + "** " + q.answer.trim()));
      L.push("");
    }

    // Agent prompt
    L.push("## Agent prompt");
    L.push("*Base instruction — goes in the agent's Instructions (Copilot) or `system` field (Claude/GPT).*");
    L.push("");
    const ap = [];
    ap.push("You are " + (state.name || "an AI agent") + ", " + (state.role || "a helpful assistant") + ".");
    if (state.domain) ap.push("Domain: " + state.domain + ".");
    ap.push("");
    ap.push("You can:");
    state.capabilities.forEach((cp, i) => { if (cp.name) ap.push("  " + (i + 1) + ". " + cp.name); });
    ap.push("");
    if (o.outputContract) {
      ap.push("ALWAYS structure your answer as:");
      outputContract().split("·").forEach(p => ap.push("  • " + p.trim()));
      ap.push("");
    }
    ap.push("Rules:");
    if (o.clarify) ap.push("- If key inputs are missing, ask targeted questions before acting — don't guess.");
    guardrailList().forEach(g => ap.push("- " + g));
    if (o.escalation) ap.push("- When a request is out of scope or high-risk, hand off to a human with a clear summary.");
    L.push(fence(ap));
    L.push("");

    // Capabilities
    L.push("## Capabilities");
    L.push("");
    state.capabilities.forEach((cp, i) => {
      L.push("### " + (i + 1) + ". " + (cp.name || "Capability"));
      const cap = [];
      cap.push("ROLE: You are " + (state.name || "the agent") + ", performing: " + (cp.name || "this capability") + ".");
      cap.push("");
      if (cp.tasks.filter(Boolean).length) {
        cap.push("METHOD:");
        cp.tasks.filter(Boolean).forEach((t, ti) => cap.push("  " + (ti + 1) + ". " + t));
        cap.push("");
      }
      if (o.outputContract) cap.push("OUTPUT: " + outputContract() + ".");
      if (o.clarify) cap.push("If you lack what you need for a step, ask before proceeding.");
      L.push(fence(cap));
      if (o.fewshot) {
        L.push("");
        L.push("*Worked example (fill in one real case to lock output quality):*");
        L.push("> **Input:** …  **Output:** " + outputContract().split("·").map(s => s.trim()).join(" → "));
      }
      L.push("");
    });

    if (o.knowledge) {
      L.push("## Knowledge sources");
      L.push("Wire these so it answers over real data and cites them:");
      L.push("");
      L.push("| Internal | External |");
      L.push("|---|---|");
      L.push("| Your specs / records / SOPs | Regulations & standards |");
      L.push("| Product & policy docs | Supplier / vendor datasheets |");
      L.push("| Past cases / tickets | Industry references |");
      L.push("");
    }

    // Deployment
    L.push("## Deployment — " + deployLabel());
    L.push("");
    if (state.deploy === "copilot") {
      L.push("Set the **Agent prompt** as the agent instructions. Create one **Topic** per capability:");
      L.push("");
      L.push("| Topic | Trigger phrases |");
      L.push("|---|---|");
      state.capabilities.forEach(cp => { if (cp.name) L.push("| " + cp.name + " | " + triggersFor(cp.name).join(" · ") + " |"); });
      L.push("");
      L.push("Connect knowledge via SharePoint / Dataverse; add Actions for any system it must call.");
    } else if (state.deploy === "claude") {
      L.push("- Put the **Agent prompt** in the `system` field (or the Project's custom instructions).");
      L.push("- Upload the knowledge sources to the Project's knowledge, or wire tools via MCP.");
      L.push("- Use the latest capable model for anything customer-facing.");
    } else {
      L.push("- Paste the **Agent prompt** into the custom GPT's *Instructions*.");
      L.push("- Upload knowledge files; add Actions (OpenAPI) for any integration.");
      L.push("- Seed the conversation starters from each capability's trigger phrases.");
    }
    L.push("");

    if (o.evals) {
      L.push("## Evaluation test cases");
      L.push("Run these after every prompt change to catch regressions:");
      L.push("");
      state.capabilities.slice(0, 5).forEach(cp => {
        if (cp.name) L.push("- **" + cp.name + "** — Given a typical request, it should follow the method and return the output contract, asking for missing inputs rather than guessing.");
      });
      L.push("- **Out of scope** — Given an unrelated request, it should decline and hand off, not attempt it.");
      L.push("- **Missing data** — Given an incomplete request, it should ask a clarifying question, not fabricate.");
      L.push("");
    }

    L.push("## Guardrails");
    guardrailList().forEach(g => L.push("- " + g));
    L.push("");

    L.push("## Best-practice checklist");
    [
      ["Clear role & scope", true],
      ["Task decomposition into capabilities", state.capabilities.length > 0],
      ["Per-capability method", state.capabilities.some(c => c.tasks.filter(Boolean).length)],
      ["Consistent output contract", o.outputContract],
      ["Ask-before-assuming", o.clarify],
      ["Worked examples", o.fewshot],
      ["Knowledge grounding", o.knowledge],
      ["Guardrails & safety", o.guardrails],
      ["Escalation path", o.escalation],
      ["Evaluation cases", o.evals]
    ].forEach(([t, on]) => L.push("- [" + (on ? "x" : " ") + "] " + t));
    L.push("");
    L.push("---");
    L.push("*Generated by Architect · local-first agent wizard.*");
    return L.join("\n");
  }

  // The Architect master prompt — run this in your own Claude/Copilot (no extra cost)
  function genPrompt() {
    const L = [];
    L.push("You are an expert AI agent architect. Design a production-ready agent for me,");
    L.push("following current best practices (clear role & scope, task decomposition, explicit");
    L.push("method per capability, a consistent output contract, guardrails against fabrication,");
    L.push("knowledge grounding with citations, an escalation path, and evaluation test cases).");
    L.push("");
    L.push("FIRST, review what I've provided below. If anything critical is missing or ambiguous,");
    L.push("ask me up to 5 targeted clarifying questions BEFORE you build. Then produce:");
    L.push("  (a) the agent's master system prompt,");
    L.push("  (b) a system prompt per capability with its method and output format,");
    L.push("  (c) knowledge sources to wire in, (d) guardrails, (e) evaluation test cases,");
    L.push("  (f) setup notes for " + deployLabel() + ".");
    L.push("");
    L.push("=== BRIEF ===");
    L.push("Agent name: " + (state.name || "(you suggest one)"));
    L.push("Role/purpose: " + (state.role || "(derive from the objective)"));
    if (state.domain) L.push("Domain: " + state.domain);
    if (state.users.length) L.push("Users: " + state.users.join(", "));
    L.push("Deploy target: " + deployLabel());
    L.push("");
    L.push("Objective: " + (state.objective || "(see JD)"));
    if (state.jd.trim()) { L.push(""); L.push("Job description:"); L.push(state.jd.trim()); }
    L.push("");
    if (state.capabilities.length) {
      L.push("Proposed capabilities & tasks (refine as needed):");
      state.capabilities.forEach((cp, i) => {
        L.push((i + 1) + ". " + (cp.name || "(unnamed)"));
        cp.tasks.filter(Boolean).forEach(t => L.push("   - " + t));
      });
      L.push("");
    }
    const answered = state.questions.filter(q => q.answer.trim());
    if (answered.length) {
      L.push("Answers to discovery questions:");
      answered.forEach(q => L.push("- " + q.q + " → " + q.answer.trim()));
      L.push("");
    }
    const open = state.questions.filter(q => !q.answer.trim() && q.q.trim());
    if (open.length) {
      L.push("Still open (ask me these if they matter):");
      open.forEach(q => L.push("- " + q.q));
      L.push("");
    }
    L.push("Best-practice options I want ON: " + OPTIONS.filter(o => state.options[o.key]).map(o => o.label).join(", ") + ".");
    return L.join("\n");
  }

  function genBlueprint() { return JSON.stringify(state, null, 2); }

  /* ===================== Overlay ===================== */
  let currentTab = "spec";
  function openOverlay() {
    currentTab = "spec";
    setTab("spec");
    el("overlay").hidden = false;
  }
  function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll("#outTabs .tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    const map = { spec: genSpec, prompt: genPrompt, blueprint: genBlueprint };
    const hints = {
      spec: "The deliverable — a best-practice agent spec. Copy/download and paste into " + deployLabel() + ".",
      prompt: "Paste this into your own Claude or Copilot (no extra cost) to have it interview you and build the final, optimised agent.",
      blueprint: "Save this to re-open the exact blueprint later via 📂 Open."
    };
    el("outBody").textContent = map[tab]();
    el("sheetHint").textContent = hints[tab];
  }
  function currentText() { return el("outBody").textContent; }
  function currentFilename() {
    const base = (state.name || "agent").toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "agent";
    return { spec: base + "-spec.md", prompt: base + "-architect-prompt.txt", blueprint: base + "-blueprint.json" }[currentTab];
  }

  /* ===================== Wiring ===================== */
  function next() {
    if (state.step === STEPS.length - 1) { openOverlay(); return; }
    state.step++; render();
  }
  function back() { if (state.step > 0) { state.step--; render(); } }

  function boot() {
    // Deep link: ?agent=<id|name-slug|keyword> opens straight to that archetype
    // (e.g. ...?agent=shoemaker). Starts a fresh blueprint pre-seeded with it.
    try {
      var want = new URLSearchParams(location.search || "").get("agent");
      if (want) {
        want = want.toLowerCase().trim();
        var slug = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
        var a = ARCHETYPES.find(function (x) {
          return x.id === want || slug(x.name).indexOf(want) !== -1 || x.keywords.indexOf(want) !== -1;
        });
        if (a) { state = blank(); state.archetypeId = a.id; seedFromArchetype(true); state.step = 1; }
      }
    } catch (e) { /* ignore malformed URL */ }

    el("agentName").oninput = () => { state.name = el("agentName").value; save(); };
    el("nextBtn").onclick = next;
    el("backBtn").onclick = back;
    el("newBtn").onclick = () => { if (confirm("Start a new agent? Your current one is saved in this browser until you overwrite it.")) { state = blank(); render(); } };
    el("generateBtn").onclick = () => { openOverlay(); };

    el("importBtn").onclick = () => el("importInput").click();
    el("importInput").onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader();
      r.onload = () => { try { state = Object.assign(blank(), JSON.parse(r.result)); render(); } catch (err) { alert("Couldn't read that blueprint."); } };
      r.readAsText(file); e.target.value = "";
    };

    document.querySelectorAll("#outTabs .tab").forEach(t => t.onclick = () => setTab(t.dataset.tab));
    el("closeOut").onclick = () => { el("overlay").hidden = true; };
    el("overlay").onclick = e => { if (e.target === el("overlay")) el("overlay").hidden = true; };
    el("copyOut").onclick = () => {
      const txt = currentText();
      navigator.clipboard.writeText(txt).then(() => flash("copyOut", "✓ Copied")).catch(() => {
        const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); flash("copyOut", "✓ Copied"); } catch (e) {}
        document.body.removeChild(ta);
      });
    };
    el("downloadOut").onclick = () => {
      const blob = new Blob([currentText()], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = currentFilename(); a.click();
      URL.revokeObjectURL(url);
    };
    document.addEventListener("keydown", e => { if (e.key === "Escape") el("overlay").hidden = true; });

    render();
  }
  function flash(id, msg) { const b = el(id), old = b.textContent; b.textContent = msg; setTimeout(() => b.textContent = old, 1200); }

  boot();
})();
