import type { WorkflowSnapshot } from '../types.ts';

/** Every id the snapshot refers to must exist in it. */
export function danglingReferences(s: WorkflowSnapshot): string[] {
  const ids = (items: readonly { id: string }[]) => new Set(items.map((item) => item.id));
  const projects = ids(s.projects);
  const agents = ids(s.agents);
  const tasks = ids(s.tasks);
  const sessions = ids(s.sessions);
  const pullRequests = ids(s.pullRequests);
  const testRuns = ids(s.testRuns);

  const problems: string[] = [];
  const need = (set: Set<string>, id: string | null | undefined, where: string) => {
    if (id != null && !set.has(id)) problems.push(`${where} -> ${id}`);
  };

  for (const a of s.agents) need(projects, a.projectId, `agent ${a.id}.projectId`);
  for (const t of s.tasks) {
    need(projects, t.projectId, `task ${t.id}.projectId`);
    need(agents, t.assigneeId, `task ${t.id}.assigneeId`);
    need(pullRequests, t.pullRequestId, `task ${t.id}.pullRequestId`);
    for (const dep of t.dependsOn) need(tasks, dep, `task ${t.id}.dependsOn`);
  }
  for (const se of s.sessions) {
    need(agents, se.agentId, `session ${se.id}.agentId`);
    need(tasks, se.taskId, `session ${se.id}.taskId`);
  }
  for (const pr of s.pullRequests) {
    need(projects, pr.projectId, `pr ${pr.id}.projectId`);
    need(tasks, pr.taskId, `pr ${pr.id}.taskId`);
    need(agents, pr.authorId, `pr ${pr.id}.authorId`);
    need(agents, pr.reviewerId, `pr ${pr.id}.reviewerId`);
  }
  for (const run of s.testRuns) need(pullRequests, run.pullRequestId, `run ${run.id}.pullRequestId`);
  for (const r of s.reviewReports) {
    need(pullRequests, r.pullRequestId, `review ${r.id}.pullRequestId`);
    need(agents, r.reviewerId, `review ${r.id}.reviewerId`);
  }
  for (const e of s.events) {
    const where = `event ${e.id}.links`;
    need(projects, e.links.projectId, where);
    need(agents, e.links.agentId, where);
    need(tasks, e.links.taskId, where);
    need(sessions, e.links.sessionId, where);
    need(pullRequests, e.links.pullRequestId, where);
    need(testRuns, e.links.testRunId, where);
  }
  return problems;
}
