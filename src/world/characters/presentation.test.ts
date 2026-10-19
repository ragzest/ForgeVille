import { describe, expect, it } from 'vitest';
import type { AgentPresence } from '../../domain/index.ts';
import { AGENTS } from '../../services/mock/seed.ts';
import { SIGH_EVERY, SIGH_LENGTH, accessoryFor, presenceLook, sighAmount, typingBurst } from './presentation.ts';

const ALL: AgentPresence[] = ['working', 'idle', 'blocked', 'awaiting_review', 'reviewing'];
const calm = { celebrating: false, reducedMotion: false };

describe('presenceLook', () => {
  it('maps every presence to a presentation token', () => {
    expect(Object.fromEntries(ALL.map((p) => [p, presenceLook(p, calm)]))).toEqual({
      working: { pose: 'typing', mark: 'none', tone: 'none', label: '', motion: 'typing' },
      idle: { pose: 'leaning-back', mark: 'none', tone: 'none', label: '', motion: 'sway' },
      blocked: { pose: 'slumped', mark: 'stop-sign', tone: 'danger', label: 'Blocked', motion: 'sigh' },
      awaiting_review: { pose: 'arms-crossed', mark: 'hourglass', tone: 'amber', label: 'Awaiting review', motion: 'none' },
      reviewing: { pose: 'reading', mark: 'magnifier', tone: 'review', label: 'Reviewing', motion: 'none' },
    });
  });

  it('gives each presence its own pose', () => {
    const poses = ALL.map((p) => presenceLook(p, calm).pose);
    expect(new Set(poses).size).toBe(ALL.length);
  });

  it('marks blocked and review states with a shape and text, not colour alone', () => {
    for (const p of ['blocked', 'awaiting_review', 'reviewing'] as const) {
      const look = presenceLook(p, calm);
      expect(look.mark).not.toBe('none');
      expect(look.label).not.toBe('');
    }
    const shapes = new Set(['blocked', 'awaiting_review', 'reviewing'].map((p) => presenceLook(p as AgentPresence, calm).mark));
    expect(shapes.size).toBe(3);
  });

  it('celebrates only while the hint is active, and never over a blocker or a review', () => {
    expect(presenceLook('idle', { celebrating: true, reducedMotion: false }).pose).toBe('cheering');
    expect(presenceLook('working', { celebrating: true, reducedMotion: false }).mark).toBe('star');
    expect(presenceLook('idle', calm).pose).not.toBe('cheering');
    expect(presenceLook('blocked', { celebrating: true, reducedMotion: false }).pose).toBe('slumped');
    expect(presenceLook('reviewing', { celebrating: true, reducedMotion: false }).pose).toBe('reading');
  });

  it('uses static poses with reduced motion', () => {
    for (const p of ALL) {
      for (const celebrating of [false, true]) {
        const look = presenceLook(p, { celebrating, reducedMotion: true });
        expect(look.motion).toBe('none');
        expect(look.pose).toBe(presenceLook(p, { celebrating, reducedMotion: false }).pose);
      }
    }
  });
});

describe('accessoryFor', () => {
  it('gives every seeded agent a different accessory', () => {
    const accessories = AGENTS.map((a, i) => accessoryFor(a.avatar, i));
    expect(new Set(accessories).size).toBe(AGENTS.length);
  });

  it('falls back by index for unknown avatars', () => {
    expect(accessoryFor('dragon', 0)).not.toBe(accessoryFor('dragon', 1));
  });
});

describe('motion rhythms', () => {
  it('types in bursts with pauses between them', () => {
    const samples = Array.from({ length: 400 }, (_, i) => typingBurst(i * 0.05));
    expect(samples.filter(Boolean).length).toBeGreaterThan(200);
    expect(samples.some((on) => !on)).toBe(true);
  });

  it('sighs now and then, and rests in between', () => {
    expect(sighAmount(0)).toBe(0);
    expect(sighAmount(SIGH_LENGTH / 2)).toBeCloseTo(1);
    expect(sighAmount(SIGH_LENGTH + 0.5)).toBe(0);
    expect(sighAmount(SIGH_EVERY + SIGH_LENGTH / 2)).toBeCloseTo(1);
    for (let t = 0; t < 20; t += 0.1) {
      expect(sighAmount(t)).toBeGreaterThanOrEqual(0);
      expect(sighAmount(t)).toBeLessThanOrEqual(1);
    }
  });
});
