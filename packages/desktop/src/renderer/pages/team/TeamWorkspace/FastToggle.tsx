import { Button, Tooltip } from '@arco-design/web-react';
import { Lightning } from '@icon-park/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getTeamServiceLabel } from './memberSummary';
import styles from './TeamWorkspace.module.css';

type Props = {
  backend?: string;
  supported: boolean;
  capabilityKnown: boolean;
  value: boolean;
  disabled?: boolean;
  loading?: boolean;
  onChange: (value: boolean) => void;
};

/** Shared icon-only control for member cards, drafts, and platform defaults. */
export default function FastToggle({
  backend,
  supported,
  capabilityKnown,
  value,
  disabled = false,
  loading = false,
  onChange,
}: Props) {
  const { t } = useTranslation();
  const on = supported && value;
  const unavailable = !supported || disabled || loading;
  const tooltip = !capabilityKnown
    ? t('team.runtime.fastUnavailable')
    : !supported
      ? t('team.runtime.fastUnsupported', { service: getTeamServiceLabel(backend ?? '') })
      : t(on ? 'team.runtime.fastOn' : 'team.runtime.fastOff');
  return (
    <Tooltip content={tooltip}>
      <span className={`${styles.fastShell} ${unavailable ? styles.unavailable : ''}`}>
        <Button
          type='text'
          size='mini'
          className={`${styles.fastButton} ${on ? styles.fastOn : styles.fastOff}`}
          icon={<Lightning theme={on ? 'filled' : 'outline'} size='15' fill='currentColor' />}
          disabled={unavailable}
          loading={loading}
          aria-label={tooltip}
          aria-pressed={on}
          data-fast-state={on ? 'on' : 'off'}
          onClick={(event) => {
            event.stopPropagation();
            onChange(!on);
          }}
        />
      </span>
    </Tooltip>
  );
}
