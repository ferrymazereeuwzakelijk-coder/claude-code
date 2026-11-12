import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Finish} from './components/Finish';
import {StepCaptions} from './components/StepCaption';
import {AppRoute, Intro} from './scenes/Explainers';
import {CompanyResult, Deckhand} from './scenes/CrewScenes';
import {TL} from './lib/anim';
import {Opening} from './scenes/Opening';
import {WhatsAppScene} from './scenes/WhatsAppScene';
import {FreelancerScene} from './scenes/FreelancerScene';
import {MatchScene} from './scenes/MatchScene';
import {Reveal, Underway} from './scenes/Reveal';

const S = TL.scenes;
const len = (k: keyof typeof S) => S[k].to - S[k].from;

/**
 * CrewingMarket — launch commercial (1080x1920, 30 fps, 30 s).
 * Every timing lives in src/timeline.json; the soundtrack is generated from the
 * same file by scripts/make_soundtrack.py.
 */
export const Commercial: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Sequence name="1 · Probleem" from={S.opening.from} durationInFrames={len('opening')}>
        <Opening />
      </Sequence>
      <Sequence name="1b · Zo werkt het" from={S.intro.from} durationInFrames={len('intro')}>
        <Intro />
      </Sequence>
      <Sequence name="2 · WhatsApp (bedrijf)" from={S.whatsapp.from} durationInFrames={len('whatsapp')}>
        <WhatsAppScene />
      </Sequence>
      <Sequence name="2b · Via de app" from={S.appRoute.from} durationInFrames={len('appRoute')}>
        <AppRoute />
      </Sequence>
      <Sequence name="2c · De matroos" from={S.deckhand.from} durationInFrames={len('deckhand')}>
        <Deckhand />
      </Sequence>
      <Sequence name="3 · Zzp'er reageert" from={S.freelancer.from} durationInFrames={len('freelancer')}>
        <FreelancerScene />
      </Sequence>
      <Sequence name="3b · Bedrijf ziet de reactie" from={S.companyResult.from} durationInFrames={len('companyResult')}>
        <CompanyResult />
      </Sequence>
      <Sequence name="4 · Match" from={S.match.from} durationInFrames={len('match')}>
        <MatchScene />
      </Sequence>
      <Sequence name="5 · Varend schip" from={S.underway.from} durationInFrames={len('underway')}>
        <Underway />
      </Sequence>
      <Sequence name="6 · Logo reveal" from={S.reveal.from} durationInFrames={len('reveal')}>
        <Reveal />
      </Sequence>
      <StepCaptions frame={frame} />
      <Finish frame={frame} />
      <Audio src={staticFile('audio/soundtrack.wav')} />
    </AbsoluteFill>
  );
};
