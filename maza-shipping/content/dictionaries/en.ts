import type { PhotoKey } from "../site";

const en = {
  langName: "English",
  meta: {
    siteName: "Maza Shipping",
    home: {
      title: "Maza Shipping | Tugboat Services & Maritime Brokerage, Netherlands",
      description:
        "Tugboat charter with the Ferry-Jo from Urk, plus maritime brokerage for tugs, barges, pontoons and workboats. Practical maritime solutions across the Netherlands.",
    },
    tugboat: {
      title: "Tugboat Charter Netherlands – Ferry-Jo | Maza Shipping",
      description:
        "Charter the tugboat Ferry-Jo: 17.40 m, Scania 450 hp, 5 t bollard pull. Towing and pushing, launch assistance, icebreaking and vessel escort from Urk.",
    },
    brokerage: {
      title: "Maritime Brokerage Netherlands – Tugs, Barges, Pontoons & Workboats | Maza Shipping",
      description:
        "Need a larger tug, a pontoon, a workboat or several vessels? Maza Shipping sources and coordinates suitable maritime resources through its industry network.",
    },
    about: {
      title: "About Maza Shipping – Marc Mazereeuw, Urk",
      description:
        "Maza Shipping is a family-run maritime service provider from Urk. Hands-on professionals, one point of contact and a practical, solution-oriented approach.",
    },
    contact: {
      title: "Contact & Quote Request | Maza Shipping",
      description:
        "Request a quote for tugboat charter or maritime brokerage. Call, e-mail or WhatsApp Marc Mazereeuw, or send your project details through the form.",
    },
    privacy: {
      title: "Privacy Notice | Maza Shipping",
      description: "How Maza Shipping handles the personal data you send through this website.",
    },
  },

  nav: {
    home: "Home",
    services: "Services",
    tugboat: "Tugboat Services",
    tugboatHint: "Ferry-Jo charter, towing & pushing",
    brokerage: "Maritime Brokerage",
    brokerageHint: "Vessels & equipment through our network",
    about: "About",
    contact: "Contact",
    requestQuote: "Request a Quote",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skip: "Skip to content",
    language: "Language",
  },

  common: {
    callMarc: "Call Marc",
    email: "E-mail",
    whatsapp: "WhatsApp",
    phone: "Telephone",
    address: "Address",
    contactPerson: "Contact person",
    requestFerryJo: "Request Ferry-Jo",
    viewVessel: "View vessel details",
    discussProject: "Discuss Your Project",
    exploreServices: "Explore Our Services",
    requestSolution: "Request a Maritime Solution",
    learnMore: "Learn more",
    homePort: "Home port",
    kvk: "Chamber of Commerce (KvK)",
    vat: "VAT",
    units: { hp: "hp", electric: "electric", decimalComma: false },
  },

  photos: {
    canalPush: "Tugboat Ferry-Jo pushing a vessel through a Dutch canal",
    aerialBargeTwoTugs: "Aerial view of the Ferry-Jo with a barge and a second tug",
    aerialTow: "Aerial view of the Ferry-Jo towing a barge",
    arklowAssist: "Ferry-Jo assisting the cargo ship Arklow Resolve",
    aerialUnderway: "Aerial view of the Ferry-Jo underway",
    iceDusk: "Ferry-Jo sailing through ice at dusk",
    bowIce: "Bow of the Ferry-Jo breaking ice",
    snowyQuay: "Ferry-Jo moored at a snow-covered quay",
    escortPort: "Ferry-Jo in port during a vessel escort",
    aboutHeader: "Ferry-Jo at work on the water",
    towing: "Ferry-Jo during a towing operation",
    launch: "Ferry-Jo alongside a newly launched cargo ship",
    iceWork: "Ferry-Jo keeping a waterway open in ice",
    ferryjoAmsterdam: "The Ferry-Jo moored along a city quay, black hull and white wheelhouse with red and white chevrons",
    deckTowClose: "View from the Ferry-Jo's aft deck: a seagoing cargo ship on the tow line",
    deckTowSea: "View from the Ferry-Jo's aft deck as a cargo ship heads out to open water",
    assistWeserborg: "The Ferry-Jo on the tow line of a large cargo ship in the harbour",
    dockHunteborg: "The Ferry-Jo towing a newbuild cargo ship out of a floating dock",
    dockHunteborgPortrait: "The Ferry-Jo with tow lines to the bow of a newbuild ship leaving the dock",
    ferryjoIce: "The Ferry-Jo breaking ice on a frozen waterway, Dutch flag flying",
    pontoonTow: "The Ferry-Jo towing a pontoon loaded with equipment through the harbour",
    pushPontoon: "The Ferry-Jo pushing a pontoon carrying a crawler excavator along a Dutch waterway",
  } satisfies Record<PhotoKey, string>,

  home: {
    hero: {
      eyebrow: "Tugboat services · Maritime brokerage",
      title: ["Maritime solutions.", "Built on experience."],
      sub: "From reliable tugboat operations to tailored maritime brokerage solutions. Maza Shipping connects expertise, vessels and opportunities on the water.",
      scroll: "Scroll",
    },
    core: {
      label: "What we do",
      title: "Two divisions. One point of contact.",
      tug: {
        title: "Tugboat Services",
        text: "Reliable tugboat support and charter solutions for maritime operations.",
      },
      broker: {
        title: "Maritime Brokerage",
        text: "The right vessels, equipment and expertise for your next maritime project.",
      },
    },
    about: {
      label: "About Maza Shipping",
      title: "No large office. Professionals who stand on deck themselves.",
      paras: [
        "Maza Shipping is a family-run maritime service provider based in Urk. With our own tugboat, the Ferry-Jo, we carry out towing and pushing work, launch assistance, icebreaking and vessel escort for shipyards, shipowners, skippers and companies with projects on or near the water.",
        "Marc Mazereeuw is your direct contact from first call to final line ashore. Alongside the tugboat operation, Marc works as a maritime broker: when a job calls for a larger tug, a pontoon, a workboat or several vessels, he finds and arranges a suitable solution through his maritime network.",
      ],
      cta: "About us",
    },
    vessel: {
      label: "Featured vessel",
      title: "Ferry-Jo",
      text: "A compact, powerful tug for inland waterways and harbours. Heavy enough for towing, pushing and icebreaking; manoeuvrable enough for tight shipyard basins and canals.",
    },
    solutions: {
      label: "Maritime solutions",
      title: "Everything your project on the water needs",
      items: [
        { title: "Tugboat Charter", text: "Charter the Ferry-Jo with experienced crew for your assignment." },
        { title: "Towing & Pushing", text: "Moving and manoeuvring ships, barges and other floating objects." },
        { title: "Barge & Pontoon Solutions", text: "Sourcing suitable barges and pontoons for transport and project work." },
        { title: "Workboat Sourcing", text: "Workboats and support vessels found through our maritime network." },
        { title: "Maritime Brokerage", text: "Connecting vessel owners and contractors for a practical arrangement." },
        { title: "Project Support", text: "Coordination and operational support from planning to execution." },
      ],
    },
    why: {
      label: "Why Maza Shipping",
      title: "Straightforward maritime partnership",
      items: [
        { title: "Practical maritime expertise", text: "We work on board ourselves and know what a job on the water really takes." },
        { title: "Direct personal communication", text: "One point of contact. No call centre, no layers between you and the people doing the work." },
        { title: "Flexible project solutions", text: "From a single tow to a multi-vessel operation, the solution is shaped around your project." },
        { title: "Access to industry connections", text: "Not limited to our own fleet: we tap into a network of vessel owners and maritime specialists." },
        { title: "Tailored operational support", text: "Planning, coordination and execution aligned with your location, schedule and constraints." },
      ],
    },
    cta: {
      title: ["Your project.", "Our maritime solution."],
      text: "Looking for a tugboat, pontoon, workboat or reliable maritime partner? Tell us what you need.",
    },
    story: {
      skip: "Skip animation",
      hint: "Scroll to follow the Ferry-Jo",
      loading: "Loading 3D scene…",
      illustration: "Illustrative 3D view",
      chaptersLabel: "Chapters",
      chapters: {
        intro: { nav: "Ferry-Jo", eyebrow: "Tugboat services · Maritime brokerage", title: ["Ferry-Jo.", "Compact in size.", "Big on effort."], text: "Towing and pushing, launch assistance, icebreaking and vessel escort from Urk." },
        push: { nav: "Pushing", eyebrow: "Pushing", title: ["Pushing transport,", "tailored."], text: "The Ferry-Jo pushes pontoons and barges safely to their destination, including in narrow waterways and harbours." },
        transition: { text: "Pontoon moored at the quay. On to the next job." },
        tow: { nav: "Towing", eyebrow: "Towing", title: ["Special transport.", "Carefully executed."], text: "On the towline, the Ferry-Jo moves loaded pontoons and special objects such as ship sections." },
        brokerage: { nav: "Brokerage", eyebrow: "Maritime brokerage", title: ["One point of contact.", "More maritime options."], text: "Does your project need more than one tug? Through our network we arrange suitable tugs, workboats and pontoons from trusted partners." },
        cta: { nav: "Contact", eyebrow: "Your project", title: ["Your project.", "Our maritime solution."], text: "Tell us what needs to happen on the water. Marc thinks along and arranges the right resources.", primary: "Request a quote", secondary: "View our services" },
      },
      partners: { harbourTug: "Partner · Harbour tug", workboat: "Partner · Workboat", cranePontoon: "Partner · Crane pontoon" },
      partnerNote: "The additional equipment shown belongs to partners and is not owned by Maza Shipping.",
      fallback: "The 3D animation is not available on this device. Above: the Ferry-Jo with a pontoon.",
    },
    ship: {
      fallback: "3D view not available on this device.",
    },
    work: {
      label: "In action",
      title: "Recent work on the water",
      items: [
        { title: "Out of the dock", text: "Towing a newbuild out of the floating dock and on to the fitting-out quay." },
        { title: "Harbour assist", text: "On the line of a seagoing cargo ship, manoeuvring through the harbour." },
        { title: "Icebreaking", text: "Keeping the waterway open when the frost sets in." },
      ],
    },
    video: {
      label: "On the water",
      title: ["Heavy work.", "Calm hands."],
      text: "The Ferry-Jo towing a pontoon loaded with equipment through the harbour. This is the work we do every week.",
    },
  },

  tug: {
    hero: {
      eyebrow: "Tugboat services & charter",
      title: ["Ferry-Jo.", "Ready for work."],
      sub: "Towing and pushing, launch assistance, icebreaking and vessel escort on Dutch inland waterways and in harbours, operated from Urk.",
    },
    intro: {
      label: "The vessel",
      title: "A dependable working tug",
      paras: [
        "The Ferry-Jo is a 17.40-metre tugboat powered by a 450 hp Scania main engine, delivering a bollard pull of 5 tonnes. An electric bow thruster gives her precise control in confined basins, along quays and in shipyard launch areas.",
        "We operate across the Netherlands on inland waterways and in harbours. Please confirm with us that your work location suits the Ferry-Jo when you send your request.",
      ],
    },
    specs: {
      label: "Technical specifications",
      title: "Vessel particulars",
      typeValue: "Tug / pusher",
      labels: {
        type: "Vessel type",
        homePort: "Home port",
        euNumber: "European vessel number",
        length: "Length",
        beam: "Beam",
        draught: "Draught",
        mainEngine: "Main engine",
        bollardPull: "Bollard pull",
        bowThruster: "Bow thruster",
        speed: "Speed",
        generator1: "Generator 1",
        generator2: "Generator 2",
        radar: "Radar",
        autopilot: "Autopilot",
        ais: "AIS",
      } as Record<string, string>,
      note: "Specifications as supplied by the owner. Final suitability is always confirmed per assignment.",
      downloadHint: "Need the full particulars for your planning? Ask Marc for a vessel datasheet.",
    },
    capabilities: {
      label: "Operational applications",
      title: "What the Ferry-Jo is deployed for",
      items: [
        { title: "Towing & pushing", text: "Moving and manoeuvring ships, barges and other floating objects for transport and projects." },
        { title: "Launch assistance", text: "Catching a newbuild or floating object during launching from a slipway or yard and bringing it to the right berth." },
        { title: "Icebreaking", text: "Keeping waterways and routes open during frost and ice formation." },
        { title: "Vessel escort", text: "Escorting and assisting vessels while sailing and manoeuvring." },
        { title: "Combined assignments", text: "For example a launch followed by moving the vessel to its outfitting berth." },
      ],
    },
    viewer: {
      label: "3D model",
      title: "Walk around the Ferry-Jo",
      text: "Drag to rotate the vessel. Wheelhouse with radar and AIS, engine casing with the Scania main engine, towing hook aft and tyre fenders all round.",
      hint: "Drag to rotate",
    },
    gallery: { label: "Gallery", title: "The Ferry-Jo at work", open: "Open photo", close: "Close", prev: "Previous photo", next: "Next photo" },
    availability: {
      title: "Planning an assignment?",
      text: "Send the vessel or object, location, preferred date or period and a short description of the work. For a launch, please include dimensions and weight so we can plan the deployment for your site.",
    },
    faq: {
      label: "Frequently asked questions",
      title: "Good to know",
      items: [
        { q: "Can the Ferry-Jo be deployed in ice?", a: "Yes. The Ferry-Jo can break ice and keep routes open during frost and ice formation. That requires a vessel and crew that stay reliable at low temperatures and in poor visibility, and who know the local waterways." },
        { q: "Can the Ferry-Jo assist with a launch?", a: "Yes. She can catch a newbuild or floating object during launching from a slipway or yard and bring it to the correct berth. Please provide dimensions and weight with your request so the deployment can be planned for your site." },
        { q: "Where do you operate?", a: "We are based in Urk and sail from there for assignments in the region and beyond, on inland waterways and in harbours across the Netherlands. Please check with us that your location suits the Ferry-Jo." },
        { q: "What if my job needs a bigger tug or more vessels?", a: "Through our maritime brokerage division we can source a larger tug, pontoons, workboats or additional vessels from our network, and coordinate the operation with you." },
        { q: "How do I request an assignment?", a: "Use the form on this page, call Marc Mazereeuw or send an e-mail. Include the vessel or object, location, preferred date or period and a short description of the work." },
        { q: "How quickly will I get a response?", a: "We aim to respond as quickly as possible. For urgent situations on the water, call Marc directly." },
      ],
    },
  },

  broker: {
    hero: {
      eyebrow: "Maritime brokerage & solutions",
      title: ["The right vessel.", "The right solution."],
      sub: "Finding the right maritime resources should not be complicated. Maza Shipping helps connect projects with suitable vessels, equipment and expertise.",
    },
    intro: {
      label: "Beyond our own fleet",
      title: "When your project needs more than one tug",
      text: "Marc Mazereeuw is active as a maritime broker alongside the Ferry-Jo operation. When a client needs a larger tugboat, a pontoon, a workboat or several vessels at once, we source suitable solutions through our maritime network and help coordinate between vessel owners and contractors.",
      note: "Vessels arranged through brokerage are owned and operated by third parties. Maza Shipping acts as intermediary and coordinator.",
    },
    services: [
      {
        title: "Tugboat Brokerage",
        text: "Sourcing and arranging tug capacity that matches the job, from harbour assistance to project towage, including larger tugs than our own.",
        points: ["Tugboat sourcing", "Charter arrangements", "Matching power and size to the job"],
      },
      {
        title: "Barge & Pontoon Charter",
        text: "Barges and pontoons for transport, working platforms and marine construction, found and arranged through our network.",
        points: ["Barges", "Pontoons and working platforms", "Combined with tug support where needed"],
      },
      {
        title: "Workboat & Support Vessel Sourcing",
        text: "Workboats and support vessels for construction, survey, maintenance and logistics on the water.",
        points: ["Workboats", "Support vessels", "Maritime equipment sourcing"],
      },
      {
        title: "Project-Specific Maritime Solutions",
        text: "Tailor-made answers for challenging operations: unusual objects, tight schedules or difficult locations.",
        points: ["Project-based vessel solutions", "Multi-vessel set-ups", "Solutions for challenging operations"],
      },
      {
        title: "Maritime Coordination",
        text: "Coordination between vessel owners, contractors and project managers, so everyone works from the same plan.",
        points: ["Owner–contractor coordination", "Maritime logistics support", "Single point of contact"],
      },
    ],
    process: {
      label: "How it works",
      title: "Three steps to a practical arrangement",
      steps: [
        { title: "Tell us your requirements", text: "Describe your project, location, dates and operational needs." },
        { title: "We explore the options", text: "Maza Shipping identifies suitable maritime resources and potential partners." },
        { title: "We connect the solution", text: "We help coordinate the next steps toward a practical arrangement." },
      ],
    },
    form: {
      label: "Project enquiry",
      title: "Tell us what you need on the water",
      intro: "The more detail you share, the faster we can explore suitable options. You will hear from Marc personally.",
    },
  },

  about: {
    hero: {
      eyebrow: "About Maza Shipping",
      title: ["Family-run.", "Hands-on."],
      sub: "A maritime service provider from Urk combining its own tugboat operation with a flexible brokerage approach.",
    },
    story: {
      label: "Who we are",
      title: "Maritime work, done by people who are on board",
      paras: [
        "Maza Shipping is a family-run maritime service provider based in Urk, the Netherlands. With the tugboat Ferry-Jo we carry out towing and pushing, launch assistance, icebreaking and vessel escort.",
        "Our clients include shipyards, shipowners, skippers, contractors and companies with projects on or near the water. We work on inland waterways and in harbours throughout the Netherlands.",
        "We are not a large office. We are professionals who stand on deck ourselves, and you deal with one point of contact for the whole job.",
      ],
    },
    marc: {
      label: "Marc Mazereeuw",
      title: "Your direct contact",
      paras: [
        "Marc Mazereeuw runs Maza Shipping and is your direct contact for every assignment, from the first enquiry to execution on the water.",
        "Besides operating the Ferry-Jo, Marc is active as a maritime broker. He uses his practical knowledge of maritime operations and his network in the industry to find and arrange suitable vessels, equipment and solutions when a project needs more than one tug.",
      ],
    },
    approach: {
      label: "Our approach",
      title: "How we work",
      items: [
        { title: "Practical first", text: "We look at what the job on the water really requires: location, object, timing and conditions." },
        { title: "One point of contact", text: "Short lines, clear agreements and a direct number you can call." },
        { title: "Own vessel, wider network", text: "The Ferry-Jo when she fits the job; our brokerage network when the job needs more." },
        { title: "Honest advice", text: "If a different set-up is safer or more efficient, we will tell you." },
      ],
    },
  },

  contact: {
    hero: {
      eyebrow: "Contact",
      title: ["Request a quote.", "Talk to Marc."],
      sub: "Tugboat charter, a brokerage request or a question about an upcoming project. Call, e-mail, WhatsApp, or use the form.",
    },
    details: { label: "Contact details", title: "Get in touch directly", urgent: "For urgent situations on the water, please call directly." },
    form: { label: "Quote request", title: "Send your request", intro: "Share what you need and we will respond as quickly as possible." },
    map: { title: "Location", open: "Open in Google Maps" },
  },

  form: {
    fields: {
      name: "Full name",
      company: "Company",
      email: "E-mail",
      phone: "Telephone",
      service: "Type of vessel or service",
      location: "Project location",
      startDate: "Required start date",
      duration: "Expected duration",
      description: "Project description",
    },
    placeholders: {
      duration: "e.g. 1 day, 2 weeks",
      location: "Port, waterway or shipyard",
      description: "Vessel or object, dimensions and weight, the work required and any constraints.",
    },
    selectPlaceholder: "Select an option",
    services: {
      ferryjo: "Ferry-Jo charter",
      towing: "Towing & pushing",
      launch: "Launch assistance",
      ice: "Icebreaking",
      escort: "Vessel escort",
      tugBroker: "Tugboat (larger / additional)",
      barge: "Barge or pontoon",
      workboat: "Workboat or support vessel",
      equipment: "Maritime equipment",
      project: "Project-specific solution",
      coordination: "Maritime coordination",
      other: "Other",
    },
    required: "required",
    privacy: "By sending this form you agree that Maza Shipping uses your details only to handle your request.",
    privacyLink: "Read our privacy notice",
    consent: "I agree that my details are used to handle this request.",
    submit: "Send request",
    sending: "Sending…",
    success: { title: "Thank you, your request has been sent.", text: "Marc will contact you as soon as possible. For urgent matters, please call directly." },
    error: "Something went wrong while sending. Please try again, or call or e-mail us directly.",
    rateLimited: "Too many requests. Please wait a moment and try again.",
    errors: {
      name: "Please enter your name.",
      email: "Please enter a valid e-mail address.",
      phone: "Please enter a valid telephone number.",
      service: "Please choose a service.",
      description: "Please describe your project (at least 10 characters).",
      consent: "Please agree to the use of your details.",
      summary: "Please check the highlighted fields.",
    },
  },

  privacy: {
    title: "Privacy notice",
    updated: "Last updated",
    sections: [
      { h: "Who we are", p: "Maza Shipping, Noorderpalen 35, 8321 CX Urk, the Netherlands, is responsible for the personal data processed through this website." },
      { h: "What we collect", p: "When you use a form we receive the details you enter: name, company, e-mail address, telephone number and information about your project. We do not use tracking cookies. The map on the contact page is only loaded from Google after you click it." },
      { h: "Why we use it", p: "Only to respond to your request and to prepare and carry out a possible assignment. The legal basis is your consent and the steps taken at your request before entering into an agreement." },
      { h: "How long we keep it", p: "We keep enquiries for as long as needed to handle them, and for no longer than two years unless an agreement follows and longer retention is legally required." },
      { h: "Sharing", p: "We do not sell your data. For brokerage requests we only share the project details needed with potential vessel owners or partners, after consulting you." },
      { h: "Your rights", p: "You may request access, correction or deletion of your data, or withdraw consent, by e-mailing marc@mazashipping.com. You can also lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens)." },
    ],
  },

  footer: {
    tagline: "Tugboat services and maritime brokerage from Urk, the Netherlands.",
    divisions: "Divisions",
    company: "Company",
    contact: "Contact",
    rights: "All rights reserved.",
    privacy: "Privacy notice",
  },

  notFound: { title: "Page not found", text: "This page has drifted off course.", back: "Back to home" },
};

export default en;
export type Dictionary = typeof en;
