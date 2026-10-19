import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import {
  AUTO_START,
  QUALITY_LABELS,
  lowerTier,
  readQualitySetting,
  writeQualitySetting,
  type KeyValueStorage,
  type QualitySetting,
  type QualityTier,
} from '../world/quality.ts';

/**
 * The graphics quality the visitor picked, and the tier Auto has settled on.
 * Presentation state only; the setting is kept in `localStorage`.
 */
export interface QualityState {
  readonly setting: QualitySetting;
  /** The tier Auto is on. Starts on High each visit and only steps down. */
  readonly autoTier: QualityTier;
  /** The latest "dropped a tier" notice; `seq` tells repeats apart. */
  readonly notice: { readonly message: string; readonly seq: number } | null;
  readonly setSetting: (setting: QualitySetting) => void;
  /** Auto saw a low frame rate: step down one tier, if there is one, and say so. */
  readonly dropAutoTier: () => void;
  readonly dismissNotice: () => void;
}

/** The tier actually drawn. */
export function effectiveTier(state: Pick<QualityState, 'setting' | 'autoTier'>): QualityTier {
  return state.setting === 'auto' ? state.autoTier : state.setting;
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createQualityStore(storage: KeyValueStorage | null = browserStorage()) {
  return createStore<QualityState>()((set, get) => ({
    setting: readQualitySetting(storage),
    autoTier: AUTO_START,
    notice: null,
    setSetting: (setting) => {
      writeQualitySetting(storage, setting);
      if (get().setting === setting) return;
      // Choosing Auto again starts it from the top.
      set({ setting, autoTier: AUTO_START, notice: null });
    },
    dropAutoTier: () => {
      const { setting, autoTier, notice } = get();
      if (setting !== 'auto') return;
      const next = lowerTier(autoTier);
      if (!next) return;
      set({
        autoTier: next,
        notice: {
          message: `The office was running slowly, so Auto dropped graphics to ${QUALITY_LABELS[next]}.`,
          seq: (notice?.seq ?? 0) + 1,
        },
      });
    },
    dismissNotice: () => {
      if (get().notice) set({ notice: null });
    },
  }));
}

export const qualityStore = createQualityStore();

export function useQuality<T>(selector: (state: QualityState) => T): T {
  return useStore(qualityStore, selector);
}

export function useEffectiveTier(): QualityTier {
  return useQuality(effectiveTier);
}
