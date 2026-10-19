import type { Page } from '@playwright/test';

/**
 * Visible text under `root` that falls below 4.5:1 against the nearest opaque
 * background, as readable strings. Text over a gradient or image is skipped,
 * since its background has no single colour.
 */
export async function lowContrastText(page: Page, root = '.shell'): Promise<string[]> {
  // Colour transitions pass through unreadable midpoints; measure once they settle.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
  return page.evaluate((selector) => {
    interface Rgb {
      r: number;
      g: number;
      b: number;
      a: number;
    }
    const parse = (css: string): Rgb | null => {
      const match = /rgba?\(([^)]+)\)/.exec(css);
      if (!match?.[1]) return null;
      const [r = 0, g = 0, b = 0, a = 1] = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return { r, g, b, a };
    };
    const luminance = ({ r, g, b }: Rgb) => {
      const f = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const background = (start: Element): Rgb | 'image' => {
      for (let el: Element | null = start; el; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (style.backgroundImage !== 'none') return 'image';
        const colour = parse(style.backgroundColor);
        if (colour && colour.a > 0.9) return colour;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };

    const found: string[] = [];
    const rootEl = document.querySelector(selector);
    if (!rootEl) return found;
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent?.trim() ?? '';
      const el = walker.currentNode.parentElement;
      if (!el || !text || seen.has(el)) continue;
      seen.add(el);
      const style = getComputedStyle(el);
      if (el.getBoundingClientRect().width === 0 || style.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) continue;
      const fg = parse(style.color);
      const bg = background(el);
      if (!fg || bg === 'image') continue;
      const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a) as [number, number];
      const ratio = (hi + 0.05) / (lo + 0.05);
      if (ratio < 4.5) found.push(`${ratio.toFixed(2)}:1 "${text.slice(0, 40)}" (${el.className || el.tagName})`);
    }
    return found;
  }, root);
}
