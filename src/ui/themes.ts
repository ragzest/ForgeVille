/**
 * Floor themes. Every floor of the ForgeVille building shares one floor plan
 * but has its own palette, time of day, and accent. The accent also tints the
 * page chrome while the visitor is on that floor.
 *
 * Status colours are not themeable: they live in `tokens.ts`, so "blocked"
 * reads the same on every floor.
 */

export type FloorThemeId = 'workshop' | 'greenhouse' | 'night-studio' | 'ember-forge';

/** Time of day outside the windows. Drives sky, sun, and whether lamps glow. */
export type FloorMood = 'morning' | 'noon' | 'night' | 'sunset';

export interface SceneColors {
  readonly floor: string;
  /** Plank seams and the darker boards in the floor pattern. */
  readonly floorSeam: string;
  readonly wall: string;
  /** Accent stripe along the walls at dado height. */
  readonly wallStripe: string;
  readonly skirting: string;
  readonly ceiling: string;
  /** Ceiling panel colour; glows when `sky.lampsOn`. */
  readonly lamp: string;
  readonly wood: string;
  readonly deskTop: string;
  /** Chairs and soft furnishings. */
  readonly fabric: string;
  readonly rug: string;
  readonly rugEdge: string;
  readonly leaf: string;
  readonly leafDark: string;
  readonly pot: string;
  readonly trim: string;
  readonly glass: string;
  /** Ground far below the windows. */
  readonly ground: string;
  /** Distant city blocks. */
  readonly city: string;
  readonly cityWindow: string;
}

export interface SkySettings {
  readonly zenith: string;
  readonly horizon: string;
  readonly fog: string;
  readonly fogNear: number;
  readonly fogFar: number;
  readonly sun: string;
  readonly sunIntensity: number;
  /** Direction the sun (or moon) shines from, as a position. */
  readonly sunPosition: readonly [number, number, number];
  readonly hemiSky: string;
  readonly hemiGround: string;
  readonly hemiIntensity: number;
  readonly ambient: number;
  readonly exposure: number;
  readonly stars: boolean;
  readonly lampsOn: boolean;
  /** Strength of the light pool each monitor throws on its desk, 0–1. */
  readonly screenGlow: number;
  /** Strength of the fake sunlight patches the windows throw on the floor, 0–1. 0 at night. */
  readonly sunPatch: number;
  /** Brightness of the unlit ground outside, 0–1: 1 shows the palette as painted, lower dims it for night. */
  readonly outdoorShade: number;
}

export interface FloorTheme {
  readonly id: FloorThemeId;
  readonly name: string;
  /** One line for the elevator panel. */
  readonly tagline: string;
  readonly mood: FloorMood;
  /** Accent for chairs, the wall stripe, signage, and page chrome. */
  readonly accent: string;
  readonly accentDeep: string;
  /** Text drawn on `accent`. */
  readonly onAccent: string;
  readonly accentSoft: string;
  /** Extra greenery: hanging planters and more pots. */
  readonly lush: boolean;
  readonly scene: SceneColors;
  readonly sky: SkySettings;
}

export const FLOOR_THEMES: Readonly<Record<FloorThemeId, FloorTheme>> = {
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    tagline: 'Honey oak and morning sun.',
    mood: 'morning',
    accent: '#4fb3e8',
    accentDeep: '#2a7fb0',
    onAccent: '#0d2233',
    accentSoft: '#d8effb',
    lush: false,
    scene: {
      floor: '#d9b48a',
      floorSeam: '#c49a6c',
      wall: '#fbf3e4',
      wallStripe: '#4fb3e8',
      skirting: '#2a7fb0',
      ceiling: '#f3efe6',
      lamp: '#fff4d6',
      wood: '#b07a4f',
      deskTop: '#f1d19b',
      fabric: '#4fb3e8',
      rug: '#f4e3c3',
      rugEdge: '#e9b07f',
      leaf: '#5fb35a',
      leafDark: '#3c8a45',
      pot: '#d0704a',
      trim: '#3d4152',
      glass: '#bfe8ff',
      ground: '#9fcf7a',
      city: '#cfd8e6',
      cityWindow: '#8fb7d9',
    },
    sky: {
      zenith: '#8ccaf5',
      horizon: '#ffe6c7',
      fog: '#f6ead8',
      fogNear: 30,
      fogFar: 90,
      sun: '#fff1d6',
      sunIntensity: 1.55,
      sunPosition: [-9, 16, 11],
      hemiSky: '#fffaf0',
      hemiGround: '#a48a6a',
      hemiIntensity: 0.95,
      ambient: 0.18,
      exposure: 1,
      stars: false,
      lampsOn: false,
      screenGlow: 0.25,
      sunPatch: 0.3,
      outdoorShade: 1,
    },
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Greenhouse',
    tagline: 'Birch, sage, and far too many plants.',
    mood: 'noon',
    accent: '#2ec4b6',
    accentDeep: '#1a8f84',
    onAccent: '#0b2421',
    accentSoft: '#d5f5f1',
    lush: true,
    scene: {
      floor: '#e6cfa6',
      floorSeam: '#d2b98e',
      wall: '#eef5e9',
      wallStripe: '#2ec4b6',
      skirting: '#1a8f84',
      ceiling: '#f4f8f1',
      lamp: '#ffffff',
      wood: '#c99e6e',
      deskTop: '#f5e6c8',
      fabric: '#2ec4b6',
      rug: '#dcefd8',
      rugEdge: '#8fd1a0',
      leaf: '#6cc551',
      leafDark: '#3f9a3a',
      pot: '#e3a76b',
      trim: '#3d4152',
      glass: '#c9f2ea',
      ground: '#8fd16a',
      city: '#d7e6dc',
      cityWindow: '#9fd0c4',
    },
    sky: {
      zenith: '#5fb8f2',
      horizon: '#d6f0ff',
      fog: '#e8f4ee',
      fogNear: 35,
      fogFar: 100,
      sun: '#ffffff',
      sunIntensity: 1.7,
      sunPosition: [6, 20, 9],
      hemiSky: '#f4fff6',
      hemiGround: '#8a9a6a',
      hemiIntensity: 1,
      ambient: 0.2,
      exposure: 1.02,
      stars: false,
      lampsOn: false,
      screenGlow: 0.2,
      sunPatch: 0.26,
      outdoorShade: 1,
    },
  },
  'night-studio': {
    id: 'night-studio',
    name: 'Night Studio',
    tagline: 'Walnut, indigo, and warm desk lamps.',
    mood: 'night',
    accent: '#c77dff',
    accentDeep: '#8b46c9',
    onAccent: '#1a1030',
    accentSoft: '#efdcff',
    lush: false,
    scene: {
      floor: '#9a6a4a',
      floorSeam: '#7a5038',
      wall: '#4a4f85',
      wallStripe: '#c77dff',
      skirting: '#26294a',
      ceiling: '#33386a',
      lamp: '#ffcf85',
      wood: '#6b4430',
      deskTop: '#d0a274',
      fabric: '#7b5bd6',
      rug: '#5a5f99',
      rugEdge: '#c77dff',
      leaf: '#5aa874',
      leafDark: '#33754f',
      pot: '#b5654a',
      trim: '#26294a',
      glass: '#8fa6ff',
      ground: '#1d2850',
      city: '#2a3360',
      cityWindow: '#ffd27a',
    },
    sky: {
      zenith: '#0d1638',
      horizon: '#2a3a78',
      fog: '#1d2850',
      fogNear: 25,
      fogFar: 75,
      sun: '#8fa6ff',
      sunIntensity: 0.55,
      sunPosition: [8, 14, -6],
      hemiSky: '#ffe2b8',
      hemiGround: '#3a3560',
      hemiIntensity: 1.05,
      ambient: 0.3,
      exposure: 1.1,
      stars: true,
      lampsOn: true,
      screenGlow: 0.6,
      sunPatch: 0,
      outdoorShade: 1,
    },
  },
  'ember-forge': {
    id: 'ember-forge',
    name: 'Ember Forge',
    tagline: 'Copper, concrete, and a golden-hour sky.',
    mood: 'sunset',
    accent: '#ff8a5b',
    accentDeep: '#c4532a',
    onAccent: '#1f1410',
    accentSoft: '#ffe3d3',
    lush: false,
    scene: {
      floor: '#c2b3a3',
      floorSeam: '#a99886',
      wall: '#8a6156',
      wallStripe: '#ff8a5b',
      skirting: '#2e2422',
      ceiling: '#6b5048',
      lamp: '#ffb36b',
      wood: '#7a4a2e',
      deskTop: '#e0b07f',
      fabric: '#c4532a',
      rug: '#7a5a52',
      rugEdge: '#ff8a5b',
      leaf: '#7ab55c',
      leafDark: '#4a8239',
      pot: '#8c4a32',
      trim: '#2e2422',
      glass: '#ffc9a6',
      ground: '#7a6250',
      city: '#6a4a5c',
      cityWindow: '#ffcf85',
    },
    sky: {
      zenith: '#3b4a8c',
      horizon: '#ff9a6a',
      fog: '#f0a77e',
      fogNear: 30,
      fogFar: 85,
      sun: '#ffab73',
      sunIntensity: 1.45,
      sunPosition: [-12, 11, 9],
      hemiSky: '#ffd8b8',
      hemiGround: '#6a4a3a',
      hemiIntensity: 0.95,
      ambient: 0.22,
      exposure: 1,
      stars: false,
      lampsOn: true,
      screenGlow: 0.4,
      sunPatch: 0.32,
      outdoorShade: 1,
    },
  },
};

export const FLOOR_THEME_IDS = Object.keys(FLOOR_THEMES) as FloorThemeId[];

/** CSS custom properties a floor sets on the page chrome. */
export function themeCssVars(theme: FloorTheme): Record<string, string> {
  return {
    '--fv-accent': theme.accent,
    '--fv-accent-deep': theme.accentDeep,
    '--fv-on-accent': theme.onAccent,
    '--fv-accent-soft': theme.accentSoft,
    '--fv-sky-top': theme.sky.zenith,
    '--fv-sky-bottom': theme.sky.horizon,
  };
}
