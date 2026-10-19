import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { qualityStore } from '../store/quality.ts';
import { PERF_READOUT, createPerfSampler, perfStatsStore } from './perfStats.ts';
import { createFrameRateWatch, type QualityTier } from './quality.ts';

/**
 * Watches the frame rate. On Auto, a frame rate under 45 fps for 3 seconds
 * drops one tier. With `?debug=perf` it also feeds the frame-time readout.
 */
export function PerfProbe({ auto, tier }: { auto: boolean; tier: QualityTier }) {
  const watch = useMemo(() => createFrameRateWatch(), []);
  const sample = useMemo(() => createPerfSampler((stats) => { perfStatsStore.setState(stats); }), []);
  // A new tier starts a fresh measurement: its first frames include the rebuild.
  useEffect(() => {
    watch.reset();
  }, [watch, auto, tier]);
  useFrame(({ gl }, delta) => {
    if (auto && watch.frame(delta)) qualityStore.getState().dropAutoTier();
    if (PERF_READOUT) sample(delta, gl.info.render.calls, gl.info.render.triangles);
  });
  return null;
}
