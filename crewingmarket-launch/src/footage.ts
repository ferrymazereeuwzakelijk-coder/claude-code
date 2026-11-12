import type {Clip} from './components/Footage';

/**
 * Real footage (Wikimedia Commons, see CREDITS.md). Clips are prepared by
 * scripts/prepare_footage.py into public/footage/.
 *
 * Every shot is editable here: in-point (seconds inside the prepared clip),
 * speed, and where the 16:9 clip is cropped to 9:16 (focusX 0 = left, 1 = right).
 * Set a slot to null to fall back to the drawn SeaScene.
 */

const credit = 'see CREDITS.md';

export type Shot = {clip: Clip; from: number; to: number; push?: number};

/** 0:00–0:04.5 opening montage, cut on the hook words (frames 8, 17, 26, 41). */
export const OPENING_SHOTS: Shot[] = [
  // a hand pushes the tug's throttle — "MORGEN"
  {from: 0, to: 17, push: 0.1, clip: {src: 'footage/helm-throttle.mp4', start: 0.45, rate: 0.85, focusX: 0.38, zoom: 1.12, credit}},
  // tug bow-on in an icy harbour — "EEN"
  {from: 17, to: 26, push: 0.05, clip: {src: 'footage/tug-vanino.mp4', start: 8.0, focusX: 0.5, zoom: 1.05, credit}},
  // the deckhand, back to camera, hauling a line — "MATROOS", "NODIG?"
  {from: 26, to: 64, push: 0.08, clip: {src: 'footage/deck-crew.mp4', start: 0.3, focusX: 0.88, credit}},
  // inland tanker from above under a storm sky
  {from: 64, to: 100, push: 0.07, clip: {src: 'footage/tanker-storm.mp4', start: 2.6, rate: 0.9, focusX: 0.66, credit}},
  // tug manoeuvring — camera pushes in, then the phone arrives
  {from: 100, to: 135, push: 0.16, clip: {src: 'footage/tug-vanino.mp4', start: 2.2, focusX: 0.46, zoom: 1.04, credit}},
];

/** The deckhand at work, just before we see his phone. */
export const DECKHAND: Clip = {src: 'footage/deck-crew.mp4', start: 2.2, focusX: 0.86, credit};

export const FOOTAGE: {
  /** 0:24.5–0:26.5 — vessel underway. */
  underway: Clip | null;
  /** Blurred backgrounds behind the phones. */
  companyBackground: Clip | null;
  freelancerBackground: Clip | null;
} = {
  underway: {src: 'footage/tanker-storm.mp4', start: 8.6, rate: 0.85, focusX: 0.56, credit},
  companyBackground: {src: 'footage/rotterdam-night.mp4', start: 4.0, focusX: 0.55, credit},
  freelancerBackground: {src: 'footage/rhine-barges.mp4', start: 1.0, focusX: 0.5, credit},
};
