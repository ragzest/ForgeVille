import { createContext, createElement, useContext, type ReactNode } from 'react';
import { TIER_RULES, type QualityTier, type TierRules } from './quality.ts';

export interface SceneQuality {
  readonly tier: QualityTier;
  readonly rules: TierRules;
}

/** The tier the canvas is drawing at. Defaults to Medium, today's look. */
export const QualityContext = createContext<SceneQuality>({ tier: 'medium', rules: TIER_RULES.medium });

export function useSceneQuality(): SceneQuality {
  return useContext(QualityContext);
}

/** Characters are not props: their small parts (hands, eyes) keep their outlines on every tier. */
export function KeepSmallOutlines({ children }: { children: ReactNode }) {
  const quality = useSceneQuality();
  const value = quality.rules.smallPropOutlines ? quality : { ...quality, rules: { ...quality.rules, smallPropOutlines: true } };
  return createElement(QualityContext.Provider, { value }, children);
}
