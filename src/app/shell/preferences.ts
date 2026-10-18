import { createContext, useContext } from 'react';

export interface ShellPreferences {
  /** Read once at startup. Later stories use it to swap motion for still poses. */
  reducedMotion: boolean;
}

export const PreferencesContext = createContext<ShellPreferences>({ reducedMotion: false });

export function usePreferences(): ShellPreferences {
  return useContext(PreferencesContext);
}
