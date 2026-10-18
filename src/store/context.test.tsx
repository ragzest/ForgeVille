import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkflow } from './context.ts';
import { WorkflowProvider } from './WorkflowProvider.tsx';
import { createWorkflowStore } from './workflowStore.ts';

function AgentCount() {
  const agents = useWorkflow((s) => s.snapshot.agents);
  return <span>{agents.length} agents</span>;
}

describe('workflow store in React', () => {
  it('reads the snapshot through the provider', () => {
    render(
      <WorkflowProvider>
        <AgentCount />
      </WorkflowProvider>,
    );
    expect(screen.getByText('7 agents')).toBeInTheDocument();
  });

  it('uses a store passed in', () => {
    const store = createWorkflowStore();
    store.getState().loadScenario('agent-blocked');
    function Scenario() {
      return <span>{useWorkflow((s) => s.snapshot.scenarioId)}</span>;
    }
    render(
      <WorkflowProvider store={store}>
        <Scenario />
      </WorkflowProvider>,
    );
    expect(screen.getByText('agent-blocked')).toBeInTheDocument();
  });

  it('fails clearly outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<AgentCount />)).toThrow('useWorkflow must be used inside <WorkflowProvider>.');
  });
});
