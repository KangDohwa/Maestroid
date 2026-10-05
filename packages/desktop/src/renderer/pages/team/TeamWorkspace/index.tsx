import React, { useEffect, useRef, useState } from 'react';
import { Button, Empty, ResizeBox, Tooltip } from '@arco-design/web-react';
import { AllApplication, CloseSmall, List, Peoples } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import type { TeamAssistant } from '@/common/types/team/teamTypes';
import type { TeamRunViewState } from '../hooks/useTeamRunView';
import type { TeamWarmupMemberState } from '../hooks/useTeamWarmup';
import { useTeamTabs } from '../hooks/TeamTabsContext';
import { getMemberTask, getMemberWorkState } from './memberSummary';
import { useTeamTasks } from './useTeamTasks';
import TeamMemberCard from './TeamMemberCard';
import styles from './TeamWorkspace.module.css';

type Props = {
  teamId: string;
  leader?: TeamAssistant;
  run: TeamRunViewState;
  runtimeStatus: Map<string, TeamWarmupMemberState>;
  renderChat: (assistant: TeamAssistant) => React.ReactNode;
  renderControls: (assistant: TeamAssistant) => React.ReactNode;
};

export default function TeamWorkspace({ teamId, leader, run, runtimeStatus, renderChat, renderControls }: Props) {
  const { t } = useTranslation();
  const { assistants, activeSlotId, switchTab, statusMap, colorOf } = useTeamTabs();
  const members = assistants.filter((assistant) => assistant.slot_id !== leader?.slot_id);
  const selectedMember = members.find((member) => member.slot_id === activeSlotId);
  const tasks = useTeamTasks(teamId);
  const [mode, setMode] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem(`team-members-view-${teamId}`) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [split, setSplit] = useState(0.5);
  const [width, setWidth] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const update = () => setWidth(element.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const min = width > 506 ? 263 / width : 0.5;
  const max = width > 506 ? (width - 243) / width : 0.5;
  const actualSplit = Math.min(max, Math.max(min, split));
  const selectMode = (value: 'grid' | 'list') => {
    setMode(value);
    try {
      localStorage.setItem(`team-members-view-${teamId}`, value);
    } catch {
      // The view remains usable when storage is unavailable.
    }
  };
  const memberPanel = (
    <section className={styles.memberPanel} data-testid='team-member-panel'>
      <header className={styles.panelHeader}>
        <span className='inline-flex min-w-0 items-center gap-6px whitespace-nowrap font-600 text-t-primary'>
          <Peoples size='15' fill='currentColor' />
          {t('team.workspace.members')}
          <span className={styles.count}>{t('team.workspace.memberCount', { count: members.length })}</span>
        </span>
        <div className={styles.viewToggle}>
          {(['grid', 'list'] as const).map((value) => (
            <Tooltip key={value} content={t(`team.workspace.${value}`)}>
              <Button
                type='text'
                size='mini'
                className={`${styles.modeButton} ${mode === value ? styles.selectedMode : ''}`}
                aria-label={t(`team.workspace.${value}`)}
                aria-pressed={mode === value}
                icon={value === 'grid' ? <AllApplication size='13' /> : <List size='13' />}
                onClick={() => selectMode(value)}
              />
            </Tooltip>
          ))}
        </div>
      </header>
      <div className={styles.scrollArea}>
        {members.length === 0 ? (
          <Empty description={t('team.workspace.noMembers')} />
        ) : (
          <div
            className={`${styles.cards} ${mode === 'list' ? styles.listMode : styles.gridMode}`}
            data-member-view={mode}
          >
            {members.map((assistant) => {
              const status = statusMap.get(assistant.slot_id);
              const runtime = runtimeStatus.get(assistant.slot_id);
              const state = getMemberWorkState({
                work: run.slotWorkBySlot[assistant.slot_id],
                status: status?.status ?? assistant.status,
                runtimeFailed: runtime?.status === 'failed',
                sessionStopped: run.sessionStopped,
              });
              const task = getMemberTask(tasks, assistant.slot_id);
              const summary =
                state === 'error'
                  ? runtime?.error || status?.last_message || t('team.work.runtimeFailed')
                  : task?.subject || status?.last_message || t('team.workspace.waitingTask');
              return (
                <TeamMemberCard
                  key={assistant.slot_id}
                  assistant={assistant}
                  state={state}
                  summary={summary}
                  preview={task ? status?.last_message : undefined}
                  color={colorOf(assistant.slot_id)}
                  controls={renderControls(assistant)}
                  onOpen={() => switchTab(assistant.slot_id)}
                />
              );
            })}
          </div>
        )}
      </div>
      {selectedMember && (
        <section
          className={styles.drawer}
          aria-label={t('team.workspace.memberConversation', { name: selectedMember.assistant_name })}
        >
          <div className={styles.drawerHeader}>
            <span className='truncate font-600 text-t-primary'>{selectedMember.assistant_name}</span>
            <Tooltip content={t('common.close')}>
              <Button
                type='text'
                size='mini'
                aria-label={t('common.close')}
                icon={<CloseSmall size='16' />}
                onClick={() => switchTab(leader?.slot_id ?? '')}
              />
            </Tooltip>
          </div>
          <div className='min-h-0 flex-1'>{renderChat(selectedMember)}</div>
        </section>
      )}
    </section>
  );
  return (
    <div ref={rootRef} className={styles.workspace} data-testid='team-workspace'>
      <ResizeBox.Split
        className={styles.split}
        size={actualSplit}
        min={min}
        max={max}
        onMoving={(_event, value) => {
          if (typeof value === 'number') setSplit(value);
        }}
        trigger={
          <Tooltip content={t('team.workspace.resizeHint')}>
            <Button
              type='text'
              className={styles.splitter}
              role='separator'
              aria-label={t('team.workspace.resizeHint')}
              aria-orientation='vertical'
              aria-valuenow={Math.round(actualSplit * 100)}
              aria-valuemin={Math.round(min * 100)}
              aria-valuemax={Math.round(max * 100)}
              onDoubleClick={() => setSplit(0.5)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault();
                  setSplit(Math.min(max, Math.max(min, actualSplit + (event.key === 'ArrowLeft' ? -0.025 : 0.025))));
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  setSplit(0.5);
                }
              }}
            />
          </Tooltip>
        }
        panes={[leader ? renderChat(leader) : null, memberPanel]}
      />
    </div>
  );
}
