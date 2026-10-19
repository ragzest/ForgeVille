import { beforeEach, describe, expect, it } from 'vitest';
import { createMockWorkflowService } from '../services/mock/index.ts';
import type { WorkflowPort } from '../services/ports.ts';
import { deskId } from '../features/desks/deskDetails.ts';
import { createInteractionStore } from '../store/interaction.ts';
import { createNavigationStore } from '../store/navigation.ts';
import { createWorkflowStore } from '../store/workflowStore.ts';
import { switchScenario } from './switchScenario.ts';

/** The mock service, except that loading `qa-failure` drops Chen and LN-4, so there is something stale to close. */
function portWithoutChen(): WorkflowPort {
  const port = createMockWorkflowService();
  return {
    ...port,
    loadScenario: (id) => {
      const snapshot = port.loadScenario(id);
      if (id !== 'qa-failure') return snapshot;
      return {
        ...snapshot,
        agents: snapshot.agents.filter((a) => a.id !== 'agent-chen'),
        tasks: snapshot.tasks.filter((t) => t.id !== 'task-ln-4'),
      };
    },
  };
}

function setup(port: WorkflowPort = createMockWorkflowService()) {
  const workflow = createWorkflowStore(port);
  const interaction = createInteractionStore();
  const navigation = createNavigationStore();
  let search = '?shell=ok';
  const url = { read: () => search, write: (next: string) => (search = next) };
  return { workflow, interaction, navigation, url, search: () => search };
}

describe('switchScenario', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup(portWithoutChen());
  });

  it('loads the scenario and writes it into the URL, keeping other parameters', () => {
    switchScenario('agent-blocked', s);
    expect(s.workflow.getState().snapshot.scenarioId).toBe('agent-blocked');
    expect(s.search()).toBe('?shell=ok&scenario=agent-blocked');
  });

  it('keeps the current floor and view', () => {
    s.navigation.getState().goToFloor('greenhouse');
    s.navigation.getState().setView('overview');
    const { floor } = s.navigation.getState();
    switchScenario('successful-merge', s);
    expect(s.navigation.getState().floor).toBe(floor);
    expect(s.navigation.getState().view).toBe('overview');
  });

  it('clears a selected task the new scenario does not have, and keeps one it does', () => {
    s.navigation.getState().selectTask('task-ln-4');
    switchScenario('agent-blocked', s);
    expect(s.navigation.getState().selectedTaskId).toBe('task-ln-4');

    switchScenario('qa-failure', s);
    expect(s.navigation.getState().selectedTaskId).toBeNull();
  });

  it("closes a desk panel whose agent is gone and keeps the board's panel open", () => {
    s.interaction.getState().activate({ id: deskId('agent-chen'), label: "Chen's desk" });
    s.interaction.getState().setFocused({ id: deskId('agent-chen'), label: "Chen's desk" });
    switchScenario('qa-failure', s);
    expect(s.interaction.getState().open).toBeNull();
    expect(s.interaction.getState().focused).toBeNull();

    s.interaction.getState().activate({ id: 'board', label: 'Task board' });
    switchScenario('qa-failure', s);
    expect(s.interaction.getState().open?.id).toBe('board');
  });

  it('keeps a desk panel open when that agent is still there', () => {
    s.interaction.getState().activate({ id: deskId('agent-ada'), label: "Ada's desk" });
    switchScenario('qa-failure', s);
    expect(s.interaction.getState().open?.id).toBe(deskId('agent-ada'));
  });

  it('works without a URL', () => {
    const { workflow, interaction, navigation } = setup();
    switchScenario('qa-failure', { workflow, interaction, navigation });
    expect(workflow.getState().snapshot.scenarioId).toBe('qa-failure');
  });
});
