import { afterEach, describe, expect, it } from 'vitest';
import { inputFromKeys, isKeyCaptureTarget, NO_INPUT, trackMovementKeys, type KeyTracker } from './input.ts';

function add<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.append(el);
  return el;
}

const press = (code: string, type: 'keydown' | 'keyup' = 'keydown') => {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true });
  window.dispatchEvent(event);
  return event;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isKeyCaptureTarget', () => {
  it('captures keys in text fields', () => {
    expect(isKeyCaptureTarget(add('input'))).toBe(true);
    expect(isKeyCaptureTarget(add('textarea'))).toBe(true);
    expect(isKeyCaptureTarget(add('select'))).toBe(true);
  });

  it('captures keys inside a [data-captures-keys] panel', () => {
    const panel = add('section', { 'data-captures-keys': '' });
    const inner = document.createElement('button');
    panel.append(inner);
    expect(isKeyCaptureTarget(panel)).toBe(true);
    expect(isKeyCaptureTarget(inner)).toBe(true);
  });

  it('leaves keys to the player elsewhere', () => {
    expect(isKeyCaptureTarget(null)).toBe(false);
    expect(isKeyCaptureTarget(document.body)).toBe(false);
    expect(isKeyCaptureTarget(add('button'))).toBe(false);
    expect(isKeyCaptureTarget(add('canvas'))).toBe(false);
  });
});

describe('inputFromKeys', () => {
  it('combines held keys and cancels opposites', () => {
    expect(inputFromKeys(new Set())).toEqual(NO_INPUT);
    expect(inputFromKeys(new Set(['forward', 'right', 'run']))).toEqual({ forward: 1, strafe: 1, run: true });
    expect(inputFromKeys(new Set(['forward', 'back', 'left']))).toEqual({ forward: 0, strafe: -1, run: false });
  });
});

describe('trackMovementKeys', () => {
  let tracker: KeyTracker;
  afterEach(() => {
    tracker.dispose();
  });

  it('reads WASD, arrows, and Shift', () => {
    tracker = trackMovementKeys(window);
    press('KeyW');
    press('ShiftLeft');
    expect(tracker.read()).toEqual({ forward: 1, strafe: 0, run: true });
    press('KeyW', 'keyup');
    press('ArrowLeft');
    tracker.read(); // the W tap was latched until this read
    expect(tracker.read()).toEqual({ forward: 0, strafe: -1, run: true });
  });

  it('counts a tap that starts and ends between two frames', () => {
    tracker = trackMovementKeys(window);
    press('KeyW');
    press('KeyW', 'keyup');
    expect(tracker.read()).toEqual({ forward: 1, strafe: 0, run: false });
    expect(tracker.read()).toEqual(NO_INPUT);
  });

  it('stops arrow keys from scrolling the page', () => {
    tracker = trackMovementKeys(window);
    expect(press('ArrowDown').defaultPrevented).toBe(true);
    expect(press('KeyX').defaultPrevented).toBe(false);
  });

  it('ignores movement keys while a text field or key-capturing panel has focus', () => {
    tracker = trackMovementKeys(window);
    const input = add('input');
    input.focus();
    press('KeyW');
    expect(tracker.read()).toEqual(NO_INPUT);

    input.blur();
    expect(tracker.read()).toEqual(NO_INPUT); // the W pressed while typing was never held

    const panel = add('div', { 'data-captures-keys': '', tabindex: '-1' });
    press('KeyD');
    panel.focus();
    expect(tracker.read()).toEqual(NO_INPUT); // focus moving in drops held keys
    panel.blur();
    expect(tracker.read()).toEqual(NO_INPUT);
  });

  it('drops held keys when the window loses focus', () => {
    tracker = trackMovementKeys(window);
    press('KeyS');
    window.dispatchEvent(new Event('blur'));
    tracker.read();
    expect(tracker.read()).toEqual(NO_INPUT);
  });

  it('stops listening after dispose', () => {
    tracker = trackMovementKeys(window);
    tracker.dispose();
    press('KeyW');
    expect(tracker.read()).toEqual(NO_INPUT);
  });
});
