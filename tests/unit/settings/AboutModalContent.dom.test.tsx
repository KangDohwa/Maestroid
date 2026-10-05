/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import lockupDark from '@renderer/assets/logos/brand/maestroid-lockup-dark.svg';
import lockupLight from '@renderer/assets/logos/brand/maestroid-lockup-light.svg';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  theme: 'light' as 'light' | 'dark',
  quitAndInstallMock: vi.fn(),
  autoUpdateCheckMock: vi.fn(),
  updateCheckMock: vi.fn(),
  messageInfoMock: vi.fn(),
  messageErrorMock: vi.fn(),
  openExternalMock: vi.fn(),
}));

vi.mock('@renderer/hooks/context/ThemeContext', () => ({
  useThemeContext: () => ({ theme: mocks.theme }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      key === 'update.preparingInstall'
        ? '准备安装...'
        : key === 'settings.updateReadyInstall'
          ? `${params?.version} 已就绪, 立即安装`
          : key,
  }),
}));

vi.mock('@arco-design/web-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arco-design/web-react')>();
  return {
    ...actual,
    Message: { ...actual.Message, info: mocks.messageInfoMock, error: mocks.messageErrorMock },
  };
});

vi.mock('@/common', () => ({
  ipcBridge: {
    autoUpdate: {
      quitAndInstall: {
        invoke: mocks.quitAndInstallMock,
      },
      check: { invoke: mocks.autoUpdateCheckMock },
    },
    update: {
      check: { invoke: mocks.updateCheckMock },
    },
  },
}));

vi.mock('@/renderer/utils/platform', () => ({
  isElectronDesktop: () => true,
  openExternalUrl: mocks.openExternalMock,
}));

vi.mock('@/renderer/components/settings/SettingsModal/settingsViewContext', () => ({
  useSettingsViewMode: () => 'modal',
}));

vi.mock('@/renderer/components/settings/SettingsModal/contents/FeedbackReportModal', () => ({
  default: () => null,
}));

import AboutModalContent from '@/renderer/components/settings/SettingsModal/contents/AboutModalContent';
import { setUpdateReadyState } from '@/renderer/components/settings/updateReadyState';

describe('AboutModalContent update ready state', () => {
  beforeEach(() => {
    mocks.theme = 'light';
    vi.stubGlobal('__APP_VERSION__', '2.1.13');
    mocks.quitAndInstallMock.mockResolvedValue(undefined);
    mocks.autoUpdateCheckMock.mockResolvedValue({ success: true });
    mocks.updateCheckMock.mockResolvedValue({
      success: true,
      data: { currentVersion: '2.1.13', updateAvailable: false, latest: null },
    });
  });

  afterEach(() => {
    setUpdateReadyState({ ready: false, version: '' });
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ['light', lockupLight],
    ['dark', lockupDark],
  ] as const)('uses the approved lockup for the %s theme', (theme, expectedLogo) => {
    mocks.theme = theme;
    render(<AboutModalContent />);

    expect(screen.getByRole('img', { name: 'login.brand' })).toHaveAttribute('src', expectedLogo);
  });

  it('shows version 0.0.1 and prevents update checks during development', () => {
    vi.stubGlobal('__APP_VERSION__', '0.0.1');
    render(<AboutModalContent />);
    expect(screen.getByText('v0.0.1')).toBeInTheDocument();
    const updateButton = screen.getByRole('button', { name: 'settings.developmentUpdatesDisabled' });
    expect(updateButton).toBeDisabled();
    fireEvent.click(updateButton);
    expect(mocks.updateCheckMock).not.toHaveBeenCalled();
    expect(screen.getByText('settings.developmentVersionPolicy')).toBeInTheDocument();
  });

  it('opens only Maestroid documentation, releases, and issue links', () => {
    mocks.openExternalMock.mockResolvedValue(undefined);
    render(<AboutModalContent />);
    fireEvent.click(screen.getByRole('button', { name: 'settings.helpDocumentation' }));
    fireEvent.click(screen.getByRole('button', { name: 'settings.updateLog' }));
    fireEvent.click(screen.getByRole('button', { name: 'settings.bugReport' }));
    expect(mocks.openExternalMock.mock.calls.map(([url]) => url)).toEqual([
      'https://github.com/KangDohwa/Maestroid/tree/main/docs',
      'https://github.com/KangDohwa/Maestroid/releases',
      'https://github.com/KangDohwa/Maestroid/issues/new',
    ]);
    expect(screen.queryByText('settings.contactMe')).not.toBeInTheDocument();
    expect(screen.queryByText('settings.officialWebsite')).not.toBeInTheDocument();
  });

  it('replaces check update with ready-to-install when an update package is ready', async () => {
    render(<AboutModalContent />);

    expect(screen.getByRole('button', { name: 'settings.checkForUpdates' })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('aionui-update-ready-state-changed', {
          detail: {
            ready: true,
            version: '2.1.14',
          },
        })
      );
    });

    fireEvent.click(await screen.findByRole('button', { name: '2.1.14 已就绪, 立即安装' }));

    expect(mocks.quitAndInstallMock).toHaveBeenCalledTimes(1);
  });

  it('shows preparing loading state for ready auto-update install from About', async () => {
    let rejectInstall!: (error: Error) => void;
    mocks.quitAndInstallMock.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectInstall = reject;
        })
    );

    render(<AboutModalContent />);

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('aionui-update-ready-state-changed', {
          detail: {
            ready: true,
            version: '2.1.14',
          },
        })
      );
    });

    fireEvent.click(await screen.findByRole('button', { name: '2.1.14 已就绪, 立即安装' }));

    expect(await screen.findByRole('button', { name: '准备安装...' })).toBeDisabled();
    expect(mocks.quitAndInstallMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectInstall(new Error('prepare failed'));
    });

    expect(await screen.findByRole('button', { name: '2.1.14 已就绪, 立即安装' })).not.toBeDisabled();
  });

  it('reveals the notification card only when an update is available, with no toast', async () => {
    mocks.updateCheckMock.mockResolvedValue({
      success: true,
      data: {
        currentVersion: '2.1.13',
        updateAvailable: true,
        latest: {
          tagName: 'v2.1.14',
          version: '2.1.14',
          name: 'v2.1.14',
          body: 'notes',
          htmlUrl: 'https://example.com/r',
          prerelease: false,
          draft: false,
          assets: [],
        },
      },
    });
    const availableListener = vi.fn();
    window.addEventListener('aionui-update-available', availableListener);

    render(<AboutModalContent />);
    fireEvent.click(screen.getByRole('button', { name: 'settings.checkForUpdates' }));

    await waitFor(() => {
      expect(availableListener).toHaveBeenCalledTimes(1);
    });
    const detail = (availableListener.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.kind).toBe('available');
    expect(detail.updateInfo.version).toBe('2.1.14');
    expect(mocks.messageInfoMock).not.toHaveBeenCalled();

    window.removeEventListener('aionui-update-available', availableListener);
  });

  it('shows an up-to-date toast and no card when there is no update', async () => {
    const availableListener = vi.fn();
    window.addEventListener('aionui-update-available', availableListener);

    render(<AboutModalContent />);
    fireEvent.click(screen.getByRole('button', { name: 'settings.checkForUpdates' }));

    await waitFor(() => {
      expect(mocks.messageInfoMock).toHaveBeenCalledWith('update.alreadyLatest');
    });
    expect(availableListener).not.toHaveBeenCalled();

    window.removeEventListener('aionui-update-available', availableListener);
  });
});
