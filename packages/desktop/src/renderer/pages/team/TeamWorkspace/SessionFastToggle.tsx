import React from 'react';
import { Message } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import { findConfigOption, useAcpConfigOptions } from '@/renderer/hooks/agent/useAcpConfigOptions';
import { useTeamPermission } from '../hooks/TeamPermissionContext';
import FastToggle from './FastToggle';
import { useRuntimeCapabilities } from './useRuntimeCapabilities';

export default function SessionFastToggle({
  backend,
  conversationId,
  disabled,
}: {
  backend: string;
  conversationId: string;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const capability = useRuntimeCapabilities(backend);
  const permission = useTeamPermission();
  const config = useAcpConfigOptions({
    conversation_id: conversationId,
    enabled: capability.fastSupported,
    configOptionsPort: permission?.configOptionsPort,
    prepareSetRuntime: permission?.warmupSession,
  });
  const current = config.pendingValues.fast ?? findConfigOption(config.configOptions, 'fast', ['fast'])?.current_value;
  return (
    <FastToggle
      backend={backend}
      supported={capability.fastSupported}
      capabilityKnown={capability.capabilityKnown}
      value={current === 'true'}
      disabled={disabled || config.isConfigOptionBlocked('fast')}
      loading={capability.fastSupported && (config.isLoading || config.setStatus.state === 'setting')}
      onChange={(value) => {
        void config.setConfigOption('fast', String(value)).catch(() => Message.error(t('agent.config.failed')));
      }}
    />
  );
}
