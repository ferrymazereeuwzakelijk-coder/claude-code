import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig} from 'remotion';

/** A real, licensed video clip placed in the vertical frame. */
export type Clip = {
  /** Path inside public/, e.g. 'footage/tug.mp4'. */
  src: string;
  /** In-point in seconds. */
  start: number;
  /** Playback speed (0.5 = slow motion). */
  rate?: number;
  /** Horizontal crop point 0..1 when a 16:9 clip is cut to 9:16. */
  focusX?: number;
  /** Vertical crop point 0..1. */
  focusY?: number;
  /** Extra zoom on top of the 9:16 crop (1 = none). */
  zoom?: number;
  /** Mirror horizontally (to change the direction of travel). */
  flip?: boolean;
  /** Credit line (shown in CREDITS.md, required by CC BY / BY-SA). */
  credit: string;
};

type Props = {
  clip: Clip;
  /** Frames since this shot started (drives the push-in). */
  t: number;
  /** Additional push-in over the shot, e.g. 0.08. */
  push?: number;
  /** Shot length in frames (for the push-in). */
  length: number;
  /** Grade: 'night' (cool, dark) or 'gold' (warm). */
  grade?: 'night' | 'gold' | 'neutral';
  blur?: number;
  brightness?: number;
};

/**
 * Plays a real clip with a cinematic finish: 9:16 crop, slow motion-control
 * push, contrast curve and a split-tone grade so all clips match.
 */
export const Footage: React.FC<Props> = ({clip, t, push = 0.06, length, grade = 'night', blur = 0, brightness = 1}) => {
  const {fps} = useVideoConfig();
  const rate = clip.rate ?? 1;
  const p = Math.min(1, Math.max(0, t / length));
  const scale = (clip.zoom ?? 1) * (1 + push * p);
  const filter =
    grade === 'night'
      ? `contrast(1.18) saturate(0.78) brightness(${0.82 * brightness})`
      : grade === 'gold'
        ? `contrast(1.12) saturate(1.05) brightness(${0.95 * brightness})`
        : `contrast(1.08) brightness(${brightness})`;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) ${clip.flip ? 'scaleX(-1)' : ''}`,
          transformOrigin: `${(clip.focusX ?? 0.5) * 100}% ${(clip.focusY ?? 0.5) * 100}%`,
          filter: `${filter}${blur ? ` blur(${blur}px)` : ''}`,
        }}
      >
        <OffthreadVideo
          src={staticFile(clip.src)}
          startFrom={Math.round(clip.start * fps)}
          playbackRate={rate}
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${(clip.focusX ?? 0.5) * 100}% ${(clip.focusY ?? 0.5) * 100}%`,
          }}
        />
      </AbsoluteFill>
      {/* split-tone: teal shadows, warm highlights */}
      <AbsoluteFill
        style={{
          background:
            grade === 'gold'
              ? 'linear-gradient(180deg, rgba(255,170,90,0.20) 0%, rgba(255,140,60,0.10) 45%, rgba(10,40,70,0.30) 100%)'
              : 'linear-gradient(180deg, rgba(10,40,80,0.45) 0%, rgba(0,30,60,0.25) 50%, rgba(0,20,40,0.45) 100%)',
          mixBlendMode: 'soft-light',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            grade === 'gold'
              ? 'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.5) 100%)'
              : 'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
