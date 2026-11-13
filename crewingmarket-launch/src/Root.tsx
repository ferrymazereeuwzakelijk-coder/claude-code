import React from 'react';
import {Composition, continueRender, delayRender} from 'remotion';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import {Commercial} from './Commercial';
import {ShortCommercial} from './short/Short';
import SHORT from './short/timeline.json';
import {SHOTS, StorePreview, StoreShot} from './store/Store';
import PREVIEW from './store/preview.json';
import {TL} from './lib/anim';

// Make sure every Inter weight is loaded before the first frame is captured.
const fontHandle = delayRender('Loading Inter');
Promise.all(
  [400, 500, 600, 700, 800, 900].map((w) => document.fonts.load(`${w} 40px Inter`)),
)
  .then(() => continueRender(fontHandle))
  .catch(() => continueRender(fontHandle));

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="AppStorePreview"
      component={StorePreview}
      durationInFrames={PREVIEW.durationInFrames}
      fps={PREVIEW.fps}
      width={PREVIEW.width}
      height={PREVIEW.height}
    />
    {SHOTS.map((_, i) => (
      <Composition
        key={i}
        id={`AppStoreShot${i + 1}`}
        component={StoreShot}
        defaultProps={{index: i}}
        durationInFrames={1}
        fps={30}
        width={1320}
        height={2868}
      />
    ))}
    <Composition
      id="CrewingMarketLaunch35"
      component={ShortCommercial}
      durationInFrames={SHORT.durationInFrames}
      fps={SHORT.fps}
      width={SHORT.width}
      height={SHORT.height}
    />
    <Composition
      id="CrewingMarketLaunch"
      component={Commercial}
      durationInFrames={TL.durationInFrames}
      fps={TL.fps}
      width={TL.width}
      height={TL.height}
    />
  </>
);
