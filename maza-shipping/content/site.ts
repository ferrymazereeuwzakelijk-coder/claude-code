/**
 * Single source of truth for company facts, the vessel and photography.
 * Everything here was taken from the previous mazashipping.com website
 * unless marked `// CONFIRM`. Edit this file to update the site.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mazashipping.com").replace(/\/$/, "");

export const company = {
  name: "Maza Shipping",
  legalName: "Maza Shipping", // CONFIRM: legal entity name
  contactPerson: "Marc Mazereeuw",
  phoneDisplay: "+31 6 52 63 83 68",
  phoneHref: "tel:+31652638368",
  email: "marc@mazashipping.com",
  // CONFIRM: WhatsApp availability on this mobile number. Set to null to hide.
  whatsapp: "31652638368" as string | null,
  address: {
    street: "Noorderpalen 35",
    postalCode: "8321 CX",
    city: "Urk",
    country: "NL",
  },
  // Public KvK register (via companyinfo.nl). CONFIRM before relying on it; set null to hide.
  kvk: "53368878" as string | null,
  vat: null as string | null, // CONFIRM: BTW number (not published on the old site)
  geo: { lat: 52.6627, lng: 5.6009, label: "52°39′N 5°36′E" }, // Urk (approximate)
} as const;

/* ------------------------------------------------------------------ */
/* Photography                                                         */
/* ------------------------------------------------------------------ */

const REMOTE_BASE =
  "https://base44.app/api/apps/6ae120e2d6811e952d184a8f/files/mp/public/6ae120e2d6811e952d184a8f";
const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_BASE ?? REMOTE_BASE;
const src = (file: string) => `${IMAGE_BASE}/${file}`;

export type Photo = { src: string; key: string };

export const photos = {
  canalPush: { key: "canalPush", src: src("c9c4e8662_ferryjo_wide.jpg") },
  aerialBargeTwoTugs: { key: "aerialBargeTwoTugs", src: src("8c4357a39_hero.jpg") },
  aerialTow: { key: "aerialTow", src: src("c5a286432_dij_sleep.jpg") },
  arklowAssist: { key: "arklowAssist", src: src("eddc1ae5a_7ba5c227-67d6-49b3-a375-2d767fc7e897.jpg") },
  aerialUnderway: { key: "aerialUnderway", src: src("84e6a3a91_PHOTO-2023-06-06-15-24-27.jpg") },
  iceDusk: { key: "iceDusk", src: src("b57b4f4ae_PHOTO-2023-06-06-16-47-21.jpg") },
  bowIce: { key: "bowIce", src: src("274b38ebb_detail_bow.jpg") },
  snowyQuay: { key: "snowyQuay", src: src("2d56fc26e_contact_schip.jpg") },
  escortPort: { key: "escortPort", src: src("3f2814f52_svc_begeleiding.jpg") },
  aboutHeader: { key: "aboutHeader", src: src("60c61058d_over_header.jpg") },
  towing: { key: "towing", src: src("45c045d69_svc_sleep.jpg") },
  launch: { key: "launch", src: src("cae5a3688_svc_tewater.jpg") },
  iceWork: { key: "iceWork", src: src("d15609f43_svc_ijs.jpg") },
  // Self-hosted photos supplied by the owner (public/images)
  ferryjoAmsterdam: { key: "ferryjoAmsterdam", src: "/images/ferryjo-amsterdam.jpg" },
  deckTowClose: { key: "deckTowClose", src: "/images/deck-tow-close.jpg" },
  deckTowSea: { key: "deckTowSea", src: "/images/deck-tow-sea.jpg" },
  assistWeserborg: { key: "assistWeserborg", src: "/images/assist-weserborg.jpg" },
  dockHunteborg: { key: "dockHunteborg", src: "/images/dock-hunteborg.jpg" },
  dockHunteborgPortrait: { key: "dockHunteborgPortrait", src: "/images/dock-hunteborg-portrait.jpg" },
  ferryjoIce: { key: "ferryjoIce", src: "/images/ferryjo-ice.jpg" },
  pontoonTow: { key: "pontoonTow", src: "/video/ferryjo-ponton.jpg" },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;

/** Owner-supplied footage: Ferry-Jo towing a loaded pontoon (public/video). */
export const video = { src: "/video/ferryjo-ponton.mp4", poster: "/video/ferryjo-ponton.jpg" };

/** Short upright clips (owner footage) for the "In action" strip on the home page. */
export const clips = {
  dock: { src: "/video/dock-tow.mp4", poster: "/video/dock-tow.jpg" },
  assist: { src: "/video/assist-tow.mp4", poster: "/video/assist-tow.jpg" },
};

export const ogImage =
  "https://media.base44.com/images/public/6ae120e2d6811e952d184a8f/e43dd3741_logo.png/v1/fill/w_1200,h_630/e43dd3741_logo.png";

/* ------------------------------------------------------------------ */
/* Vessel                                                              */
/* ------------------------------------------------------------------ */

export type SpecRow = { key: string; value: string };

export type Units = { hp: string; electric: string; decimalComma: boolean };

/** Translates units in a spec value ("450 hp", "15 hp (electric)", "17.40 m") for the page language. */
export function localizeSpec(value: string, u: Units) {
  const v = value.replace(/\bhp\b/g, u.hp).replace("(electric)", `(${u.electric})`);
  return u.decimalComma ? v.replace(/(\d)\.(\d)/g, "$1,$2") : v;
}

export const ferryJo = {
  name: "Ferry-Jo",
  homePort: "Urk",
  euNumber: "02203689",
  lengthM: "17.40",
  powerHp: "450",
  bollardPullT: "5",
  /** Labels are translated via dictionary `specs.labels[key]`. */
  specs: [
    { key: "type", value: "type" }, // translated value
    { key: "homePort", value: "Urk" },
    { key: "euNumber", value: "02203689" },
    { key: "length", value: "17.40 m" },
    { key: "beam", value: "4.60 m" },
    { key: "draught", value: "2.20 / 1.65 m" },
    { key: "mainEngine", value: "Scania · 450 hp · CCR2" },
    { key: "bollardPull", value: "5 t" },
    { key: "bowThruster", value: "15 hp (electric)" },
    { key: "speed", value: "20.5 km/h" },
    { key: "generator1", value: "11 kVA" },
    { key: "generator2", value: "30 kVA · CCR2" },
    { key: "radar", value: "Alphatron JMA 608t" },
    { key: "autopilot", value: "Sigma 500" },
    { key: "ais", value: "Furuno FA150" },
  ] satisfies SpecRow[],
  gallery: [
    "assistWeserborg",
    "dockHunteborgPortrait",
    "ferryjoIce",
    "dockHunteborg",
    "deckTowClose",
    "deckTowSea",
    "ferryjoAmsterdam",
    "canalPush",
    "aerialTow",
    "arklowAssist",
    "iceDusk",
    "bowIce",
    "aerialUnderway",
    "launch",
    "escortPort",
    "snowyQuay",
    "iceWork",
    "aerialBargeTwoTugs",
    "towing",
  ] satisfies PhotoKey[],
} as const;
