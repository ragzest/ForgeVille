import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { wantsPerfReadout } from './quality.ts';

/** Development aid: `?debug=perf` shows a frame-time readout over the office. Never in a build. */
export const PERF_READOUT: boolean = import.meta.env.DEV && typeof window !== 'undefined' && wantsPerfReadout(window.location.search);

export interface PerfStats {
  /** Mean frame time over the last sample, in milliseconds. */
  readonly frameMs: number;
  readonly fps: number;
  /** Draw calls in the last complete frame. */
  readonly calls: number;
  readonly triangles: number;
}

export const perfStatsStore = createStore<PerfStats>()(() => ({ frameMs: 0, fps: 0, calls: 0, triangles: 0 }));

export function usePerfStats<T>(selector: (stats: PerfStats) => T): T {
  return useStore(perfStatsStore, selector);
}

/** Averages frame times and publishes a few times a second, so the readout never costs a re-render per frame. */
export function createPerfSampler(publish: (stats: PerfStats) => void, every = 0.5) {
  let time = 0;
  let frames = 0;
  return (delta: number, calls: number, triangles: number) => {
    time += delta;
    frames += 1;
    if (time < every) return;
    publish({ frameMs: (time / frames) * 1000, fps: frames / time, calls, triangles });
    time = 0;
    frames = 0;
  };
}
