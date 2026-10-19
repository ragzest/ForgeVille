import { CanvasTexture, SRGBColorSpace } from 'three';
import {
  REQUIRED_CHECKS,
  missionControlMetrics,
  type CheckKind,
  type TestRunStatus,
  type WorkflowSnapshot,
} from '../../domain/index.ts';
import { MONO_FONT, UI_FONT } from '../../ui/fonts.ts';
import { COLORS } from '../../ui/tokens.ts';
import { COLUMN_NOTE, wallNotes, type BoardColumn } from './board.ts';

/**
 * In-world displays: the Kanban whiteboard, the QA screen, and the project
 * status display. Each has a pure view model derived from the snapshot (so
 * tests need no canvas) and a painter that turns it into a texture. They only
 * read; the readable, interactive versions are the overlay panels.
 */

// ---------------------------------------------------------------------------
// Kanban board

export { COLUMN_NOTE, WALL_NOTES, boardColumns, type BoardCard, type BoardColumn } from './board.ts';

// ---------------------------------------------------------------------------
// QA screen

export interface QaRow {
  readonly check: CheckKind;
  readonly label: string;
  readonly status: TestRunStatus | 'not_run';
}

export interface QaDisplay {
  /** e.g. `PR #2 · Add-to-list button`, or null when no pull request is open. */
  readonly heading: string | null;
  readonly rows: readonly QaRow[];
}

const CHECK_LABEL: Readonly<Record<CheckKind, string>> = { unit: 'Unit tests', build: 'Build', browser: 'Browser tests' };

/** The newest open pull request's required checks, or the newest pull request when none is open. */
export function qaDisplay(snapshot: WorkflowSnapshot): QaDisplay {
  const prs = [...snapshot.pullRequests].sort((a, b) => b.number - a.number);
  const pr = prs.find((p) => p.state === 'open') ?? prs[0];
  if (!pr) return { heading: null, rows: [] };
  const rows = REQUIRED_CHECKS.map((check) => {
    const runs = snapshot.testRuns.filter((r) => r.pullRequestId === pr.id && r.check === check);
    return { check, label: CHECK_LABEL[check], status: runs.at(-1)?.status ?? ('not_run' as const) };
  });
  return { heading: `PR #${String(pr.number)} · ${pr.title}${pr.state === 'merged' ? ' (merged)' : ''}`, rows };
}

// ---------------------------------------------------------------------------
// Status display

export interface StatusTile {
  readonly label: string;
  readonly value: string;
  readonly tone: 'neutral' | 'success' | 'danger' | 'review';
}

export function statusTiles(snapshot: WorkflowSnapshot): StatusTile[] {
  const m = missionControlMetrics(snapshot);
  return [
    { label: 'Active agents', value: String(m.activeAgents), tone: 'success' },
    { label: 'Open PRs', value: String(m.openPullRequests), tone: 'review' },
    { label: 'Blocked', value: String(m.blockedTasks), tone: m.blockedTasks > 0 ? 'danger' : 'neutral' },
    { label: 'Merged', value: String(m.successfulMerges), tone: 'neutral' },
  ];
}

// ---------------------------------------------------------------------------
// Painting

function surface(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) return null;
  ctx.textBaseline = 'middle';
  return [canvas, ctx];
}

function done(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1);
  return `${cut}…`;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, lw = 3) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** Whiteboard surface: column chips along the top, sticky notes below. Sized for a 4.2 × 1.5 m board. */
/** `selected` is outlined, so the wall marks the same card as the overlay. */
export function paintBoard(columns: readonly BoardColumn[], heading: string, selected: string | null = null): CanvasTexture | null {
  const made = surface(1680, 600);
  if (!made) return null;
  const [canvas, ctx] = made;
  ctx.fillStyle = COLORS.whiteboard;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 34px ${UI_FONT}`;
  ctx.fillText(heading, 24, 34);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `500 22px ${UI_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Simulated board · open for details', canvas.width - 24, 36);
  ctx.textAlign = 'left';

  const top = 70;
  const lane = (canvas.width - 24) / columns.length;
  columns.forEach((col, i) => {
    const x = 12 + i * lane;
    const colors = COLUMN_NOTE[col.column];
    rounded(ctx, x + 6, top, lane - 12, 44, 22, colors.chip, COLORS.ink);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `700 22px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${col.label} · ${String(col.cards.length)}`, x + lane / 2, top + 23);
    ctx.textAlign = 'left';
    if (i > 0) {
      ctx.strokeStyle = COLORS.line;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, top + 60);
      ctx.lineTo(x, canvas.height - 16);
      ctx.stroke();
    }
    if (col.cards.length === 0) {
      ctx.fillStyle = COLORS.inkSoft;
      ctx.font = `500 20px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('Empty', x + lane / 2, top + 100);
      ctx.textAlign = 'left';
    }
    const { notes, more } = wallNotes(col, selected);
    notes.forEach(({ card, selected: isSelected }, k) => {
      const y = top + 62 + k * 112;
      const tilt = ((k + i) % 3 - 1) * 0.02;
      ctx.save();
      ctx.translate(x + lane / 2, y + 50);
      ctx.rotate(tilt);
      if (isSelected) {
        // A thick ember ring around the selected note.
        rounded(ctx, -lane / 2 + 6, -56, lane - 12, 114, 14, COLORS.ember, COLORS.ink);
      }
      rounded(ctx, -lane / 2 + 14, -48, lane - 28, 98, 8, colors.note, COLORS.ink);
      ctx.fillStyle = COLORS.ink;
      ctx.font = `700 22px ${MONO_FONT}`;
      ctx.fillText(card.issueKey, -lane / 2 + 26, -26);
      ctx.font = `500 19px ${UI_FONT}`;
      ctx.fillText(fit(ctx, card.title, lane - 56), -lane / 2 + 26, 4);
      ctx.fillStyle = COLORS.inkSoft;
      ctx.font = `500 17px ${UI_FONT}`;
      ctx.fillText(fit(ctx, card.assignee, lane - 56), -lane / 2 + 26, 32);
      ctx.restore();
    });
    if (more > 0) {
      ctx.fillStyle = COLORS.inkSoft;
      ctx.font = `600 18px ${UI_FONT}`;
      ctx.fillText(`+${String(more)} more`, x + 18, canvas.height - 18);
    }
  });
  return done(canvas);
}

const QA_STATUS: Readonly<Record<QaRow['status'], { icon: string; text: string; color: string }>> = {
  passed: { icon: '✓', text: 'Passed', color: COLORS.success },
  failed: { icon: '✕', text: 'Failed', color: COLORS.danger },
  running: { icon: '◐', text: 'Running', color: COLORS.amber },
  queued: { icon: '…', text: 'Queued', color: COLORS.inkSoft },
  not_run: { icon: '–', text: 'Not run', color: COLORS.inkSoft },
};

/** QA wall screen: the pull request and one row per required check, with icon and word. */
export function paintQa(display: QaDisplay): CanvasTexture | null {
  const made = surface(960, 500);
  if (!made) return null;
  const [canvas, ctx] = made;
  ctx.fillStyle = COLORS.screen;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#eeeef6';
  ctx.font = `700 40px ${UI_FONT}`;
  ctx.fillText('QA lab', 36, 52);
  rounded(ctx, canvas.width - 210, 30, 180, 44, 22, COLORS.amber);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 22px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('SIMULATED', canvas.width - 120, 53);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#b8b8d0';
  ctx.font = `500 26px ${UI_FONT}`;
  ctx.fillText(fit(ctx, display.heading ?? 'No pull requests yet', canvas.width - 72), 36, 112);
  display.rows.forEach((row, i) => {
    const y = 180 + i * 96;
    const s = QA_STATUS[row.status];
    rounded(ctx, 30, y - 38, canvas.width - 60, 78, 18, '#25253a');
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(80, y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = row.status === 'passed' || row.status === 'failed' ? '#ffffff' : COLORS.ink;
    ctx.font = `700 28px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(s.icon, 80, y + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eeeef6';
    ctx.font = `600 30px ${UI_FONT}`;
    ctx.fillText(row.label, 124, y);
    ctx.fillStyle = s.color;
    ctx.textAlign = 'right';
    ctx.fillText(s.text, canvas.width - 60, y);
    ctx.textAlign = 'left';
  });
  return done(canvas);
}

const TILE_TONE: Readonly<Record<StatusTile['tone'], string>> = {
  neutral: '#eeeef6',
  success: COLORS.success,
  danger: COLORS.danger,
  review: '#a99bff',
};

/** Project status display: the project name and four big numbers. */
export function paintStatus(title: string, tiles: readonly StatusTile[]): CanvasTexture | null {
  const made = surface(1040, 380);
  if (!made) return null;
  const [canvas, ctx] = made;
  ctx.fillStyle = COLORS.screen;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#eeeef6';
  ctx.font = `700 40px ${UI_FONT}`;
  ctx.fillText(fit(ctx, title, canvas.width - 280), 32, 48);
  ctx.fillStyle = '#8a8aa8';
  ctx.font = `500 22px ${UI_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Simulated metrics', canvas.width - 32, 50);
  ctx.textAlign = 'left';
  const w = (canvas.width - 64 - 3 * 16) / 4;
  tiles.forEach((tile, i) => {
    const x = 32 + i * (w + 16);
    rounded(ctx, x, 100, w, 240, 22, '#25253a');
    ctx.fillStyle = TILE_TONE[tile.tone];
    ctx.font = `700 110px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(tile.value, x + w / 2, 205);
    ctx.fillStyle = '#c8c8de';
    ctx.font = `600 26px ${UI_FONT}`;
    ctx.fillText(tile.label, x + w / 2, 300);
    ctx.textAlign = 'left';
  });
  return done(canvas);
}
