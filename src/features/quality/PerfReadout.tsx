import { usePerfStats } from '../../world/perfStats.ts';
import { useEffectiveTier } from '../../store/quality.ts';

/** `?debug=perf`, dev builds only: frame time, frame rate, and draw calls over the office. */
export function PerfReadout() {
  const stats = usePerfStats((s) => s);
  const tier = useEffectiveTier();
  return (
    <output className="perf-readout" data-testid="perf-readout" aria-label="Frame time">
      {stats.frameMs.toFixed(1)} ms · {Math.round(stats.fps)} fps · {stats.calls} calls · {Math.round(stats.triangles / 1000)}k tris · {tier}
    </output>
  );
}
