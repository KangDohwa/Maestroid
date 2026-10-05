import { describe, expect, it } from 'vitest';

import type { Assistant } from '@/common/types/agent/assistantTypes';
import {
  pickDefaultAssistantSelectionKey,
  resolveAssistantSelectionKey,
} from '@/renderer/pages/guid/hooks/useGuidAssistantSelection';

describe('guid assistant selection helpers', () => {
  const assistants: Assistant[] = [
    assistant({ id: 'builtin-writer', source: 'builtin', runtimeKey: 'claude', sort_order: 20 }),
    assistant({ id: 'bare-aionrs', source: 'generated', runtimeKey: 'aionrs', sort_order: 10 }),
    assistant({ id: 'user-research', source: 'user', runtimeKey: 'gemini', sort_order: 30 }),
  ];

  it('prefers explicit custom assistant keys when the assistant exists', () => {
    expect(resolveAssistantSelectionKey('custom:user-research', assistants)).toBe('user-research');
  });

  it('does not accept legacy backend keys as assistant selection ids', () => {
    expect(resolveAssistantSelectionKey('claude', assistants)).toBeUndefined();
    expect(resolveAssistantSelectionKey('aionrs', assistants)).toBeUndefined();
  });

  it('defaults to the generated aionrs assistant when available', () => {
    expect(pickDefaultAssistantSelectionKey(assistants)).toBe('bare-aionrs');
  });

  it('returns null when no assistants are available', () => {
    expect(pickDefaultAssistantSelectionKey([])).toBeNull();
  });

  it('prefers Antigravity for a new conversation without changing saved Gemini selection', () => {
    const gemini = assistant({ id: 'bare-gemini', source: 'generated', runtimeKey: 'gemini' });
    const antigravity = assistant({ id: 'bare-antigravity', source: 'generated', runtimeKey: 'antigravity' });
    const catalog = [...assistants, gemini, antigravity];
    expect(pickDefaultAssistantSelectionKey(catalog)).toBe('bare-antigravity');
    expect(resolveAssistantSelectionKey('bare-gemini', catalog)).toBe('bare-gemini');
    expect(resolveAssistantSelectionKey('custom:user-research', catalog)).toBe('user-research');
  });

  it('does not pick Gemini as a default and ignores disabled Antigravity', () => {
    const gemini = assistant({ id: 'bare-gemini', source: 'generated', runtimeKey: 'gemini' });
    const disabled = assistant({
      id: 'bare-antigravity',
      source: 'generated',
      runtimeKey: 'antigravity',
      enabled: false,
    });
    expect(pickDefaultAssistantSelectionKey([gemini])).toBeNull();
    expect(pickDefaultAssistantSelectionKey([...assistants, disabled])).toBe('bare-aionrs');
  });
});

function assistant(
  overrides: Partial<Assistant> & { id: string; source: Assistant['source']; runtimeKey: string }
): Assistant {
  const agentId = `agent-${overrides.runtimeKey}`;
  const isAionrs = overrides.runtimeKey === 'aionrs';
  return {
    id: overrides.id,
    source: overrides.source,
    name: overrides.id,
    name_i18n: {},
    description_i18n: {},
    enabled: true,
    sort_order: overrides.sort_order ?? 0,
    agent_id: agentId,
    agent: isAionrs
      ? { type: 'aionrs', source: 'internal' }
      : { type: 'acp', source: 'builtin', acp_backend: overrides.runtimeKey },
    enabled_skills: [],
    custom_skill_names: [],
    disabled_builtin_skills: [],
    context_i18n: {},
    prompts: [],
    prompts_i18n: {},
    models: [],
    agent_status: 'online',
    team_selectable: true,
    deletable: overrides.source === 'user',
    ...overrides,
  };
}
