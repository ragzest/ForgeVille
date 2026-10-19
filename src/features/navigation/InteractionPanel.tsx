import { Fragment, type ReactNode } from 'react';
import { useWorkflow } from '../../store/context.ts';
import { useInteraction } from '../../store/interaction.ts';
import { BoardPanel } from '../board/BoardPanel.tsx';
import { PullRequestPanel } from '../qa/PullRequestPanel.tsx';
import { ElevatorPanel } from '../building/ElevatorPanel.tsx';
import { OtherFloorPanel } from '../building/OtherFloorPanel.tsx';
import { useNavigation } from '../../store/navigation.ts';
import { floorOfAgent } from '../../world/building.ts';
import { DeskPanel } from '../desks/DeskPanel.tsx';
import { MissionControlPanel } from '../mission-control/MissionControlPanel.tsx';
import { STATUS_TARGET } from '../mission-control/missionControl.ts';
import { agentIdFromDesk } from '../desks/deskDetails.ts';

const COMING_IN: Readonly<Record<string, string>> = {
  reception: 'Project overview arrives with the vertical slice (E09).',
};

/**
 * Remounts its panel when the scenario changes. Panels keep small local state
 * (a chosen pull request, a refusal message), and a switch should drop it.
 */
function PerScenario({ children }: { children: ReactNode }) {
  const scenarioId = useWorkflow((s) => s.snapshot.scenarioId);
  return <Fragment key={scenarioId}>{children}</Fragment>;
}

/**
 * A desk on this floor opens its panel. A desk on another floor offers the
 * ride instead, since the visitor is not in that room. An unknown agent gets
 * the desk panel, which says so.
 */
function DeskRoute({ agentId, title }: { agentId: string; title: string }) {
  const floorId = useNavigation((s) => s.floor);
  const agentFloor = useWorkflow((s) => floorOfAgent(s.snapshot, agentId)?.id ?? null);
  if (agentFloor !== null && agentFloor !== floorId) return <OtherFloorPanel key={agentId} agentId={agentId} />;
  return (
    <PerScenario>
      <DeskPanel key={agentId} agentId={agentId} title={title} />
    </PerScenario>
  );
}

/** The activated object's panel: the desk panel, or a placeholder until that object's story lands. */
export function InteractionPanel() {
  const open = useInteraction((s) => s.open);
  const close = useInteraction((s) => s.close);
  if (!open) return null;
  const agentId = agentIdFromDesk(open.id);
  if (agentId !== null) return <DeskRoute agentId={agentId} title={open.label} />;
  if (open.id === 'elevator') return <ElevatorPanel title={open.label} />;
  if (open.id === 'board') {
    return (
      <PerScenario>
        <BoardPanel title={open.label} />
      </PerScenario>
    );
  }
  if (open.id === 'qa-screen') {
    return (
      <PerScenario>
        <PullRequestPanel title={open.label} />
      </PerScenario>
    );
  }
  if (open.id === STATUS_TARGET.id) return <MissionControlPanel />;
  const kind = open.id;

  return (
    <section className="panel" role="dialog" aria-modal="false" aria-labelledby="interaction-panel-title">
      <header className="panel-header">
        <h2 id="interaction-panel-title">{open.label}</h2>
        <button type="button" className="panel-close" onClick={close} aria-label="Close panel">
          ×
        </button>
      </header>
      <p>
        Object id: <code>{open.id}</code>
      </p>
      <p className="panel-note">{COMING_IN[kind] ?? 'Details arrive in a later story.'}</p>
      <p className="panel-note">
        Press <kbd>Esc</kbd> to close.
      </p>
    </section>
  );
}
