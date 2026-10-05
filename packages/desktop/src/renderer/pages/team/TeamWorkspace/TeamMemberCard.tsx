import React, { useRef, useState } from 'react';
import { Button, Card, Input, Message, Tooltip } from '@arco-design/web-react';
import type { RefInputType } from '@arco-design/web-react/es/Input/interface';
import { Edit, Right } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { TeamAssistant } from '@/common/types/team/teamTypes';
import type { AcpConfigOptionDto } from '@/common/types/platform/acpTypes';
import { deriveSelectOption } from '@/renderer/hooks/agent/useAcpConfigOptions';
import TeamAgentIdentity from '../components/TeamAgentIdentity';
import { useTeamTabs } from '../hooks/TeamTabsContext';
import type { MemberWorkState } from './memberSummary';
import { getTeamServiceLabel } from './memberSummary';
import styles from './TeamWorkspace.module.css';

type Props = {
  assistant: TeamAssistant;
  state: MemberWorkState;
  summary: string;
  preview?: string;
  controls: React.ReactNode;
  color: string;
  onOpen: () => void;
};

export default function TeamMemberCard({ assistant, state, summary, preview, controls, color, onOpen }: Props) {
  const { t } = useTranslation();
  const { renameAssistant } = useTeamTabs();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(assistant.assistant_name);
  const committing = useRef(false);
  const inputRef = useRef<RefInputType>(null);
  const { data: config } = useSWR<AcpConfigOptionDto[]>(['acp-config-options', assistant.conversation_id], null);
  const model = deriveSelectOption(config, 'model', ['model']);
  const reasoning = deriveSelectOption(config, 'thought_level', ['thought_level', 'reasoning_effort']);
  const modelLabel =
    model?.options.find((item) => item.value === model.currentValue)?.label ?? model?.currentValue ?? assistant.model;
  const reasoningLabel =
    reasoning?.options.find((item) => item.value === reasoning.currentValue)?.label ?? reasoning?.currentValue;
  const metadata = [modelLabel, reasoningLabel].filter(Boolean).join(' · ');
  const service = getTeamServiceLabel(assistant.assistant_backend);
  const shortService = assistant.assistant_backend === 'codex' ? 'O' : service.slice(0, 1).toUpperCase();
  const statusText = t(`team.workspace.status.${state}`);
  const commitRename = async () => {
    if (committing.current || !editing) return;
    const trimmed = (inputRef.current?.dom?.value ?? name).trim();
    setEditing(false);
    if (!trimmed || trimmed === assistant.assistant_name || !renameAssistant) return;
    committing.current = true;
    try {
      await renameAssistant(assistant.slot_id, trimmed);
    } catch (error) {
      Message.error(String(error));
    } finally {
      committing.current = false;
    }
  };
  return (
    <Card
      className={`${styles.card} ${styles[state]}`}
      bodyStyle={{ padding: 0 }}
      data-testid={`team-member-card-${assistant.slot_id}`}
      data-work-state={state}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardIdentity}>
          <div className={styles.avatar}>
            <TeamAgentIdentity
              assistant_backend={assistant.assistant_backend}
              assistant_name={assistant.assistant_name}
              icon={assistant.icon}
              nameClassName='hidden'
            />
          </div>
          <div className={styles.nameArea}>
            {editing ? (
              <Input
                ref={inputRef}
                size='mini'
                autoFocus
                value={name}
                onChange={setName}
                aria-label={t('team.sider.rename')}
                onBlur={() => void commitRename()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void commitRename();
                  } else if (event.key === 'Escape') setEditing(false);
                }}
              />
            ) : (
              <Tooltip content={`${assistant.assistant_name}${metadata ? ` · ${metadata}` : ''}`}>
                <Button type='text' className={styles.nameButton} onClick={onOpen}>
                  {assistant.assistant_name}
                </Button>
              </Tooltip>
            )}
            {renameAssistant && !editing && (
              <Tooltip content={t('team.sider.rename')}>
                <Button
                  type='text'
                  size='mini'
                  className={styles.renameButton}
                  aria-label={t('team.workspace.renameMember', { name: assistant.assistant_name })}
                  icon={<Edit size='12' fill='currentColor' />}
                  onClick={() => {
                    setName(assistant.assistant_name);
                    setEditing(true);
                  }}
                />
              </Tooltip>
            )}
          </div>
          <span className={styles.service} title={service} style={{ color }}>
            <span className={styles.serviceFull}>{service}</span>
            <span className={styles.serviceShort}>{shortService}</span>
          </span>
          <span className={styles.metadata} title={metadata}>
            <span className={styles.modelName}>{modelLabel}</span>
            {reasoningLabel && <span className={styles.reasoning}> · {reasoningLabel}</span>}
          </span>
        </div>
        <Tooltip content={statusText}>
          <span className={styles.status} aria-label={statusText}>
            <span className={styles.dot} />
            <span className={styles.statusText}>{statusText}</span>
          </span>
        </Tooltip>
      </div>
      <div className={styles.controls}>{controls}</div>
      <Tooltip content={summary}>
        <Button type='text' className={styles.summary} onClick={onOpen}>
          {summary}
        </Button>
      </Tooltip>
      {preview && (
        <p className={styles.preview} title={preview}>
          {preview}
        </p>
      )}
      <Button type='text' className={styles.openButton} onClick={onOpen}>
        {t('team.workspace.openConversation')}
        <Right size='12' fill='currentColor' />
      </Button>
    </Card>
  );
}
