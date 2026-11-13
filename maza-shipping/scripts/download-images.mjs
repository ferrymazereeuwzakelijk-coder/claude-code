// Downloads the original Maza Shipping photos from the previous (Base44) website
// into /public/images so the site can self-host them.
// Usage: npm run images:download  — then set NEXT_PUBLIC_IMAGE_BASE=/images
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE =
  "https://base44.app/api/apps/6ae120e2d6811e952d184a8f/files/mp/public/6ae120e2d6811e952d184a8f";
const FILES = [
  "c9c4e8662_ferryjo_wide.jpg",
  "8c4357a39_hero.jpg",
  "c5a286432_dij_sleep.jpg",
  "eddc1ae5a_7ba5c227-67d6-49b3-a375-2d767fc7e897.jpg",
  "84e6a3a91_PHOTO-2023-06-06-15-24-27.jpg",
  "b57b4f4ae_PHOTO-2023-06-06-16-47-21.jpg",
  "274b38ebb_detail_bow.jpg",
  "2d56fc26e_contact_schip.jpg",
  "3f2814f52_svc_begeleiding.jpg",
  "60c61058d_over_header.jpg",
  "45c045d69_svc_sleep.jpg",
  "cae5a3688_svc_tewater.jpg",
  "d15609f43_svc_ijs.jpg",
];
const LOGO =
  "https://media.base44.com/images/public/user_69dfa40d6996f109d6364013/e9d45a39b_mazashippinglogo.png";

const out = path.join(process.cwd(), "public", "images");
await mkdir(out, { recursive: true });

async function save(url, name) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(path.join(out, name), Buffer.from(await res.arrayBuffer()));
  console.log("✓", name);
}

for (const f of FILES) await save(`${BASE}/${f}`, f);
await save(LOGO, "mazashipping-logo.png").catch((e) => console.warn("Logo:", e.message));
console.log("\nDone. Set NEXT_PUBLIC_IMAGE_BASE=/images in .env.local to self-host.");
