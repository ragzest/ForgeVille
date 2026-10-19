import { useFrame } from '@react-three/fiber';
import { useRef, useState, type RefObject } from 'react';
import { Vector3, type Object3D } from 'three';
import { repaintDelay } from '../quality.ts';
import type { ScreenModel } from './screenModel.ts';

const cameraAt = new Vector3();
const screenAt = new Vector3();

/**
 * The screen model a monitor should paint now. A changed model is adopted at
 * once up close, after a short wait further away, and not at all beyond
 * `REPAINT_MAX_DISTANCE`: a far monitor keeps its last picture until the
 * camera comes closer. The first picture is always painted.
 */
export function useThrottledScreen(model: ScreenModel, anchor: RefObject<Object3D | null>): ScreenModel {
  const [shown, setShown] = useState(model);
  const pendingSince = useRef<number | null>(null);
  useFrame(({ camera, clock }) => {
    if (shown.key === model.key) {
      pendingSince.current = null;
      return;
    }
    const now = clock.elapsedTime;
    pendingSince.current ??= now;
    const object = anchor.current;
    const distance = object ? camera.getWorldPosition(cameraAt).distanceTo(object.getWorldPosition(screenAt)) : 0;
    if (now - pendingSince.current >= repaintDelay(distance)) {
      pendingSince.current = null;
      setShown(model);
    }
  });
  return shown;
}
