/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 * Modified for Maestroid: disable updates and reserve the fork release address.
 */

import { CdnGenericProvider } from './cdnGenericProvider';
import type { CdnGenericProviderConfiguration } from './cdnGenericProvider';

// Re-enable only after Maestroid's update metadata and installer feed are configured.
export const AUTO_UPDATES_ENABLED = false;
export const CDN_UPDATE_BASE_URL = 'https://github.com/KangDohwa/Maestroid/releases/latest/download';

export type CdnFeedOptions = CdnGenericProviderConfiguration & {
  updateProvider: typeof CdnGenericProvider;
};

export function buildCdnFeedOptions(): CdnFeedOptions {
  return {
    provider: 'custom',
    url: CDN_UPDATE_BASE_URL,
    updateProvider: CdnGenericProvider,
  };
}
