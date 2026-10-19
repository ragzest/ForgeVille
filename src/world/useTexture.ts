import { useEffect, useMemo } from 'react';
import type { Texture } from 'three';

/**
 * A canvas texture rebuilt when `key` changes and disposed when replaced or
 * unmounted. `paint` may return null where canvas is unavailable.
 */
export function usePaintedTexture(key: string, paint: () => Texture | null): Texture | null {
  // `paint` is a fresh closure every render; `key` names what it draws.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(() => paint(), [key]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}
