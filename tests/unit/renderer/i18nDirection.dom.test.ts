/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LanguageSwitcher from '@/renderer/components/settings/LanguageSwitcher';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
}));
vi.mock('@/renderer/services/i18n', async () => {
  const { normalizeLanguageCode, SUPPORTED_LANGUAGES } = await import('@/common/config/i18n');
  return {
    changeLanguage: vi.fn(async () => {}),
    supportedLanguages: SUPPORTED_LANGUAGES,
    normalizeLanguageCode,
  };
});

afterEach(cleanup);

import { applyDocumentDirection, directionForLanguage, isRtlLanguage } from '@/renderer/services/i18n/direction';

describe('isRtlLanguage / directionForLanguage', () => {
  it('uses English LTR fallback for a disabled RTL language', () => {
    expect(isRtlLanguage('fa-IR')).toBe(false);
    expect(directionForLanguage('fa-IR')).toBe('ltr');
  });

  it('normalises regional and underscore variants before deciding', () => {
    expect(isRtlLanguage('fa')).toBe(false);
    expect(isRtlLanguage('fa_IR')).toBe(false);
  });

  it('treats every other shipped language as LTR', () => {
    for (const lang of ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'de-DE', 'ru-RU', 'tr-TR', 'uk-UA']) {
      expect(isRtlLanguage(lang)).toBe(false);
      expect(directionForLanguage(lang)).toBe('ltr');
    }
  });

  it('defaults to LTR for missing input', () => {
    expect(isRtlLanguage(undefined)).toBe(false);
    expect(isRtlLanguage(null)).toBe(false);
    expect(directionForLanguage(undefined)).toBe('ltr');
  });
});

describe('applyDocumentDirection', () => {
  it('sets English dir and lang on <html> for a disabled RTL language', () => {
    applyDocumentDirection('fa-IR');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en-US');
  });

  it('switches back to LTR when the language changes away', () => {
    applyDocumentDirection('fa-IR');
    applyDocumentDirection('ko-KR');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('ko-KR');
  });
});

describe('LanguageSwitcher supported options', () => {
  it('shows only English and Korean and falls back from an old saved language', () => {
    const { container } = render(React.createElement(LanguageSwitcher));
    expect(screen.getByText('settings.languageEnglish')).toBeInTheDocument();
    fireEvent.click(container.querySelector('.arco-select-view')!);
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'settings.languageKorean' })).toBeInTheDocument();
  });
});
