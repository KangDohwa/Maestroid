/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeLanguageCode,
  DEFAULT_LANGUAGE,
  resolveInitialLanguage,
  SUPPORTED_LANGUAGES,
} from '@/common/config/i18n';

describe('i18n', () => {
  describe('normalizeLanguageCode', () => {
    it('passes through English and rejects disabled exact tags', () => {
      expect(normalizeLanguageCode('en-US')).toBe('en-US');
      expect(normalizeLanguageCode('zh-CN')).toBe('en-US');
      expect(normalizeLanguageCode('de-DE')).toBe('en-US');
      expect(normalizeLanguageCode('fa-IR')).toBe('en-US');
    });

    it('normalizes underscores to hyphens', () => {
      expect(normalizeLanguageCode('de_DE')).toBe('en-US');
      expect(normalizeLanguageCode('fa_IR')).toBe('en-US');
      expect(normalizeLanguageCode('pt_BR')).toBe('en-US');
    });

    it('falls back for a disabled base language', () => {
      expect(normalizeLanguageCode('zh')).toBe('en-US');
    });

    it('keeps Korean and falls back for disabled regions and scripts', () => {
      expect(normalizeLanguageCode('zh-HK')).toBe('en-US');
      expect(normalizeLanguageCode('zh-MO')).toBe('en-US');
      expect(normalizeLanguageCode('zh_HK')).toBe('en-US');
      expect(normalizeLanguageCode('zh-Hant')).toBe('en-US');
      expect(normalizeLanguageCode('zh-Hant-HK')).toBe('en-US');
      expect(normalizeLanguageCode('zh-Hans-SG')).toBe('en-US');
      expect(normalizeLanguageCode('zh-SG')).toBe('en-US');
      expect(normalizeLanguageCode('ja')).toBe('en-US');
      expect(normalizeLanguageCode('ko')).toBe('ko-KR');
      expect(normalizeLanguageCode('tr')).toBe('en-US');
      expect(normalizeLanguageCode('ru')).toBe('en-US');
      expect(normalizeLanguageCode('uk')).toBe('en-US');
      expect(normalizeLanguageCode('pt')).toBe('en-US');
      expect(normalizeLanguageCode('de')).toBe('en-US');
      expect(normalizeLanguageCode('es')).toBe('en-US');
      expect(normalizeLanguageCode('fr')).toBe('en-US');
      expect(normalizeLanguageCode('fa')).toBe('en-US');
    });

    it('falls back for disabled German regional variants', () => {
      expect(normalizeLanguageCode('de-AT')).toBe('en-US');
      expect(normalizeLanguageCode('de-CH')).toBe('en-US');
    });

    it('falls back to the default language for unsupported codes', () => {
      expect(normalizeLanguageCode('it')).toBe(DEFAULT_LANGUAGE);
      expect(normalizeLanguageCode('')).toBe(DEFAULT_LANGUAGE);
    });
  });

  it('supports only English and Korean', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en-US', 'ko-KR']);
  });

  it.each([
    [undefined, 'ko-KR', 'ko-KR'],
    [undefined, 'ko_KR', 'ko-KR'],
    [undefined, 'ja-JP', 'en-US'],
    ['en-US', 'ko-KR', 'en-US'],
    ['ko-KR', 'en-US', 'ko-KR'],
    ['zh-CN', 'ko-KR', 'en-US'],
  ])('resolves saved %s and system %s to %s', (saved, system, expected) => {
    expect(resolveInitialLanguage(saved, system)).toBe(expected);
  });
});
