import type { EventLinks, ProjectId, WorkflowEvent, WorkflowSnapshot } from './types.ts';

/**
 * One project's slice of the snapshot: its agents, tasks, sessions, pull
 * requests, runs, reviews, and events, with the clock and scenario kept.
 * A pure selector: it filters the snapshot's own records and never copies
 * them into a second store, so every view of a floor reads the same data.
 *
 * Results are cached per snapshot, so the same inputs return the same object
 * and React memo and store selectors stay stable.
 */
const cache = new WeakMap<WorkflowSnapshot, Map<ProjectId | null, WorkflowSnapshot>>();

export function projectSnapshot(snapshot: WorkflowSnapshot, projectId: ProjectId | null): WorkflowSnapshot {
  let byProject = cache.get(snapshot);
  if (!byProject) {
    byProject = new Map();
    cache.set(snapshot, byProject);
  }
  const hit = byProject.get(projectId);
  if (hit) return hit;
  const scoped = scope(snapshot, projectId);
  byProject.set(projectId, scoped);
  return scoped;
}

function scope(snapshot: WorkflowSnapshot, projectId: ProjectId | null): WorkflowSnapshot {
  const agents = snapshot.agents.filter((a) => a.projectId === projectId);
  const tasks = snapshot.tasks.filter((t) => t.projectId === projectId);
  const pullRequests = snapshot.pullRequests.filter((p) => p.projectId === projectId);
  const agentIds = new Set(agents.map((a) => a.id));
  const taskIds = new Set(tasks.map((t) => t.id));
  const prIds = new Set(pullRequests.map((p) => p.id));
  return {
    ...snapshot,
    projects: snapshot.projects.filter((p) => p.id === projectId),
    agents,
    tasks,
    sessions: snapshot.sessions.filter((s) => agentIds.has(s.agentId)),
    pullRequests,
    testRuns: snapshot.testRuns.filter((r) => prIds.has(r.pullRequestId)),
    reviewReports: snapshot.reviewReports.filter((r) => prIds.has(r.pullRequestId)),
    events: snapshot.events.filter((e) => eventInProject(e, projectId, { agentIds, taskIds, prIds })),
  };
}

/** An event belongs to the project it names, or else to the project of an agent, task, or pull request it links. */
function eventInProject(
  event: WorkflowEvent,
  projectId: ProjectId | null,
  ids: { agentIds: Set<string>; taskIds: Set<string>; prIds: Set<string> },
): boolean {
  const links: EventLinks = event.links;
  if (links.projectId !== undefined) return links.projectId === projectId;
  return (
    (links.agentId !== undefined && ids.agentIds.has(links.agentId)) ||
    (links.taskId !== undefined && ids.taskIds.has(links.taskId)) ||
    (links.pullRequestId !== undefined && ids.prIds.has(links.pullRequestId))
  );
}
