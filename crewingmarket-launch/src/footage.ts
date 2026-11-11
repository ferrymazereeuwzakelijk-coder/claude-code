/**
 * Real footage slots. No maritime video was supplied, so every slot is `null`
 * and the stylised canvas scene (SeaScene) is used instead.
 *
 * To use real, licensed footage: put the clip in public/footage/ and set the
 * path here, e.g. opening: 'footage/tug-night.mp4'. Clips are cropped to 9:16
 * (object-fit: cover) and muted — the soundtrack carries all audio.
 */
export const FOOTAGE: {
  /** 0:00–0:04.5 — working vessel / tug, dramatic, ideally night or bad weather. */
  opening: string | null;
  /** 0:24.5–0:26.5 — wide shot of a vessel underway, golden hour. */
  underway: string | null;
  /** Optional backgrounds behind the phones (blurred automatically). */
  companyBackground: string | null;
  freelancerBackground: string | null;
} = {
  opening: null,
  underway: null,
  companyBackground: null,
  freelancerBackground: null,
};
