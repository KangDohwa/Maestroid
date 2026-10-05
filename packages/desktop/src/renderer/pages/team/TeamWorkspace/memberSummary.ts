import type { ITeamSlotWork, ITeamTaskItem, TeammateStatus } from '@/common/types/team/teamTypes';

export type MemberWorkState = 'working' | 'idle' | 'error';

/** Runtime readiness alone never marks a member as working. */
export function getMemberWorkState({
  work,
  status,
  runtimeFailed,
  sessionStopped,
}: {
  work?: ITeamSlotWork;
  status: TeammateStatus;
  runtimeFailed: boolean;
  sessionStopped: boolean;
}): MemberWorkState {
  if (runtimeFailed || work?.blocked_reason === 'runtime_failed' || status === 'failed') return 'error';
  if (sessionStopped) return 'idle';
  if (work) return work.state === 'running' ? 'working' : 'idle';
  return status === 'active' ? 'working' : 'idle';
}

/** Prefer current work, then the most recently updated assignment. */
export function getMemberTask(tasks: ITeamTaskItem[], slotId: string): ITeamTaskItem | undefined {
  return tasks
    .filter((task) => task.owner === slotId && task.status !== 'deleted')
    .sort((a, b) => {
      const priority = (task: ITeamTaskItem) => (task.status === 'in_progress' ? 0 : task.status === 'pending' ? 1 : 2);
      return priority(a) - priority(b) || b.updated_at - a.updated_at;
    })[0];
}

/** Product names are labels, never inferred backend capabilities. */
export function getTeamServiceLabel(backend: string): string {
  if (backend === 'claude') return 'Claude Code';
  if (backend === 'codex') return 'Codex';
  if (backend === 'antigravity') return 'Antigravity';
  return backend;
}
