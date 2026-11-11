import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Phone} from '../components/Phone';
import {PALETTES, SeaScene} from '../components/SeaScene';
import {Footage} from '../components/Footage';
import {Highlight, Shot, Tap} from '../components/ScreenUI';
import {RoleLabel} from '../components/Finish';
import {FOOTAGE} from '../footage';
import {camera, CamKey, cameraSpeed, easeOut, fadeIn, ramp, TL} from '../lib/anim';

const F = TL.freelancer;
const FROM = TL.scenes.freelancer.from;

export const FREELANCER_CAM: CamKey[] = [
  {f: 435, s: 0.55, fx: 660, fy: 1434, rx: -8, ry: 40, rz: 8, tx: 1700},
  {f: 453, s: 1.0, rx: 5, ry: 12, rz: 1, tx: 0},
  {f: 470, s: 1.42, fy: 1880, rx: 2, ry: 4},
  {f: 486, s: 1.38, fy: 1640, ry: 0},
  {f: 502, s: 1.5, fy: 1260},
  {f: 522, s: 1.55, fy: 1420},
  {f: 538, s: 1.5, fy: 1000},
  {f: 572, s: 1.62, fy: 940, ry: -3},
  {f: 600, s: 1.3, fy: 1250, ry: 0},
];

/** The freelancer's CrewingMarket web app — real screenshots only. */
export const FreelancerScreen: React.FC<{f: number}> = ({f}) => {
  const toast = ramp(f, [F.reacted, F.reacted + 12], [0, 1], easeOut);
  return (
    <>
      <Shot src="app-home.png" />
      <Shot src="app-assignments.png" opacity={fadeIn(f, F.assignments, 6)} />
      {f >= F.reacted && (
        <>
          <Shot src="app-reacted.png" opacity={fadeIn(f, F.reacted, 3)} />
          {/* hide the baked-in toast while the live one slides in */}
          <Shot
            src="app-assignments.png"
            opacity={1 - ramp(f, [F.reacted + 8, F.reacted + 13], [0, 1])}
            style={{clipPath: 'inset(214px 0 2380px 0)'}}
          />
          <Shot
            src="app-reacted.png"
            y={(1 - toast) * -320}
            opacity={Math.min(1, toast * 2)}
            style={{clipPath: 'inset(222px 24px 2384px 24px)'}}
          />
          <Highlight frame={f} at={F.reacted + 16} x={40} y={226} w={1240} h={250} radius={30} />
          <Highlight frame={f} at={F.reacted + 24} x={104} y={1574} w={478} h={88} color="#21a35a" radius={44} />
        </>
      )}
      {TL.taps
        .filter((t) => t.phone === 'freelancer')
        .map((t) => (
          <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={false} />
        ))}
    </>
  );
};

export const FreelancerScene: React.FC = () => {
  const f = useCurrentFrame() + FROM;
  const cam = camera(f, FREELANCER_CAM);
  const speed = cameraSpeed(f, FREELANCER_CAM);
  const blur = Math.min(26, Math.max(0, speed - 35) * 0.1);
  const label = fadeIn(f, 448, 6) * (1 - fadeIn(f, 464, 6));

  return (
    <AbsoluteFill style={{background: '#06142a', overflow: 'hidden'}}>
      <AbsoluteFill style={{filter: 'blur(20px) brightness(0.72)', transform: 'scale(1.12)'}}>
        {FOOTAGE.freelancerBackground ? (
          <Footage clip={FOOTAGE.freelancerBackground} t={f - FROM} length={165} push={0.05} grade="neutral" />
        ) : (
          <SeaScene
              frame={f}
              palette={PALETTES.blue}
              horizon={0.56}
              zoom={1.1}
              vessel={{x: 300, y: 1230, scale: 1.2, speed: 0.4}}
              glowX={420}
            />
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 50%, rgba(59,116,255,0.22) 0%, rgba(0,0,0,0) 58%)'}}
      />
      <Phone cam={cam} blur={blur} glare={1.5}>
        <FreelancerScreen f={f} />
      </Phone>
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 110}}>
        <RoleLabel text="ZZP'ER" sub="op crewingmarket.com" opacity={label} y={(1 - label) * -20} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
