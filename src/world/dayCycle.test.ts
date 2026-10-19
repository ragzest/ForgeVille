import { describe, expect, it } from 'vitest';
import { FLOOR_THEMES, FLOOR_THEME_IDS } from '../ui/themes.ts';
import { FLOOR_TINT, SKY_KEYFRAMES, floorSky, hourOfDay, mixHex, skyAtHour, skyPhase } from './dayCycle.ts';

const at = (hhmm: string) => `2026-03-02T${hhmm}:00.000Z`;

describe('day cycle', () => {
  it('is off by default in the sense that each floor keeps its own mood', () => {
    for (const id of FLOOR_THEME_IDS) {
      expect(floorSky(FLOOR_THEMES[id], false, at('03:00'))).toBe(FLOOR_THEMES[id].sky);
    }
  });

  it('reads the hour from the scenario clock in UTC', () => {
    expect(hourOfDay(at('08:30'))).toBe(8.5);
    expect(hourOfDay('2026-03-02T23:45:00.000Z')).toBe(23.75);
  });

  it('runs night, dawn, noon, golden hour, dusk, night in order', () => {
    expect(SKY_KEYFRAMES.map((k) => k.phase)).toEqual(['night', 'dawn', 'noon', 'golden-hour', 'dusk', 'night']);
    const hours = SKY_KEYFRAMES.map((k) => k.hour);
    expect([...hours].sort((a, b) => a - b)).toEqual(hours);
  });

  it('lands exactly on each keyframe at its hour', () => {
    for (const frame of SKY_KEYFRAMES) {
      const sky = skyAtHour(frame.hour);
      expect(sky.zenith).toBe(frame.sky.zenith);
      expect(sky.sunIntensity).toBeCloseTo(frame.sky.sunIntensity);
      expect(sky.stars).toBe(frame.sky.stars);
    }
  });

  it('blends between keyframes', () => {
    const dawn = SKY_KEYFRAMES[1]?.sky;
    const noon = SKY_KEYFRAMES[2]?.sky;
    const mid = skyAtHour(9.75);
    expect(dawn && noon).toBeTruthy();
    if (!dawn || !noon) return;
    expect(mid.sunIntensity).toBeGreaterThan(dawn.sunIntensity);
    expect(mid.sunIntensity).toBeLessThan(noon.sunIntensity);
    expect(mid.sunPosition[1]).toBeGreaterThan(dawn.sunPosition[1]);
    expect(mid.sunPosition[1]).toBeLessThan(noon.sunPosition[1]);
    expect(mid.zenith).not.toBe(dawn.zenith);
    expect(mid.zenith).not.toBe(noon.zenith);
  });

  it('stays night through the small hours and wraps around midnight', () => {
    for (const hour of [22, 23.5, 0, 2, 4.5]) {
      const sky = skyAtHour(hour);
      expect(sky.stars, String(hour)).toBe(true);
      expect(sky.lampsOn, String(hour)).toBe(true);
      expect(sky.sunPatch, String(hour)).toBe(0);
    }
    expect(skyPhase(at('00:00'))).toBe('night');
    expect(skyPhase(at('07:15'))).toBe('dawn');
    expect(skyPhase(at('12:00'))).toBe('noon');
    expect(skyPhase(at('17:00'))).toBe('golden-hour');
    expect(skyPhase(at('20:10'))).toBe('dusk');
  });

  it('keeps a little of each floor in the clock-driven sky', () => {
    const clock = at('12:30');
    const workshop = floorSky(FLOOR_THEMES.workshop, true, clock);
    const studio = floorSky(FLOOR_THEMES['night-studio'], true, clock);
    expect(workshop.zenith).not.toBe(studio.zenith);
    expect(workshop.zenith).toBe(mixHex(skyAtHour(12.5).zenith, FLOOR_THEMES.workshop.sky.zenith, FLOOR_TINT));
    // Light levels come from the clock alone.
    expect(workshop.sunIntensity).toBe(studio.sunIntensity);
    expect(workshop.stars).toBe(false);
  });

  it('is pure: the same clock always gives the same sky', () => {
    const a = floorSky(FLOOR_THEMES.greenhouse, true, at('16:20'));
    const b = floorSky(FLOOR_THEMES.greenhouse, true, at('16:20'));
    expect(a).toEqual(b);
  });

  it('mixes colours channel by channel', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#102030', '#102030', 0.3)).toBe('#102030');
  });
});
