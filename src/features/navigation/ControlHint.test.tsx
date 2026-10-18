import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ControlHint } from './ControlHint.tsx';

function setLocked(el: Element | null) {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => el });
  act(() => {
    document.dispatchEvent(new Event('pointerlockchange'));
  });
}

afterEach(() => {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
});

describe('ControlHint', () => {
  it('explains how to start and how to release the mouse', () => {
    setLocked(null);
    render(<ControlHint />);
    expect(screen.getByText(/Click the office to look around/)).toBeInTheDocument();

    setLocked(document.body);
    expect(screen.getByText(/to release the mouse/)).toBeInTheDocument();

    setLocked(null);
    expect(screen.getByText(/Click the office to look around/)).toBeInTheDocument();
  });
});
