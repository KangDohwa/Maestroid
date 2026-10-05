import { ipcBridge } from '@/common';
import type { ITeamTaskItem } from '@/common/types/team/teamTypes';
import { useEffect } from 'react';
import useSWR from 'swr';

/** A lightweight task summary feed; member transcripts are loaded only when opened. */
export function useTeamTasks(teamId: string): ITeamTaskItem[] {
  const { data, mutate } = useSWR(['team-member-tasks', teamId], () =>
    ipcBridge.team.listTasks.invoke({ team_id: teamId })
  );
  useEffect(
    () =>
      ipcBridge.team.taskChanged.on((event) => {
        if (event.team_id !== teamId) return;
        const task = event.task;
        if (!task) {
          void mutate();
          return;
        }
        void mutate((current = []) => [...current.filter((item) => item.id !== task.id), task], false);
      }),
    [teamId, mutate]
  );
  return data ?? [];
}
