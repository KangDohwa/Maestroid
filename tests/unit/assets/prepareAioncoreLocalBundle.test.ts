import { describe, expect, it, vi, afterAll } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const childProcess = require('node:child_process');
const networkExec = vi.spyOn(childProcess, 'execSync').mockImplementation(() => {
  throw new Error('Network execution must not occur for explicit local bundle input');
});
const networkFileExec = vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
  throw new Error('Network execution must not occur for explicit local bundle input');
});
const prepareModulePath = require.resolve('../../../packages/shared-scripts/src/prepare-aioncore');
const previousModule = require.cache[prepareModulePath];
delete require.cache[prepareModulePath];
const { prepareAioncore, getDownloadUrl } = require(prepareModulePath);

afterAll(() => {
  vi.restoreAllMocks();
  if (previousModule) require.cache[prepareModulePath] = previousModule;
  else delete require.cache[prepareModulePath];
});

describe('prepare-aioncore local bundle input', () => {
  it('rejects an input bundle at the output path without deleting its binary', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'maestroid-overlapping-bundle-'));
    const localBundle = join(tmp, 'resources', 'bundled-aioncore', 'win32-x64');
    mkdirSync(join(localBundle, 'managed-resources'), { recursive: true });
    writeFileSync(join(localBundle, 'aioncore.exe'), 'preserved');
    writeFileSync(join(localBundle, 'managed-resources', 'manifest.json'), '{}');
    const previous = process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR;
    process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR = localBundle;
    try {
      expect(() => prepareAioncore({ projectRoot: tmp, platform: 'win32', arch: 'x64', version: 'latest' })).toThrow(
        /outside the output directory/
      );
      expect(readFileSync(join(localBundle, 'aioncore.exe'), 'utf8')).toBe('preserved');
    } finally {
      if (previous === undefined) delete process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR;
      else process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR = previous;
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('hard fails local bundle input that lacks managed-resources manifest', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'aionui-local-bundle-'));
    const projectRoot = join(tmp, 'project');
    const localBundle = join(tmp, 'bundle');
    mkdirSync(join(localBundle, 'managed-resources'), { recursive: true });
    writeFileSync(join(localBundle, 'aioncore.exe'), '');

    const previous = process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR;
    process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR = localBundle;
    try {
      expect(() =>
        prepareAioncore({
          projectRoot,
          platform: 'win32',
          arch: 'x64',
          version: 'v0.1.46',
        })
      ).toThrow(join('managed-resources', 'manifest.json'));
    } finally {
      if (previous === undefined) delete process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR;
      else process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR = previous;
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it.each(['aioncore.exe', 'managed-resources'])(
    'rejects missing %s before network or removing an existing bundle',
    (missing) => {
      const tmp = mkdtempSync(join(tmpdir(), 'maestroid-local-bundle-'));
      const projectRoot = join(tmp, 'project');
      const localBundle = join(tmp, 'bundle');
      const existingBundle = join(projectRoot, 'resources', 'bundled-aioncore', 'win32-x64');
      mkdirSync(localBundle, { recursive: true });
      mkdirSync(existingBundle, { recursive: true });
      writeFileSync(join(existingBundle, 'aioncore.exe'), 'preserved');
      if (missing !== 'aioncore.exe') writeFileSync(join(localBundle, 'aioncore.exe'), '');
      if (missing !== 'managed-resources') {
        mkdirSync(join(localBundle, 'managed-resources'));
        writeFileSync(join(localBundle, 'managed-resources', 'manifest.json'), '{}');
      }
      const previous = process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR;
      process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR = localBundle;
      networkExec.mockClear();
      networkFileExec.mockClear();
      try {
        expect(() => prepareAioncore({ projectRoot, platform: 'win32', arch: 'x64', version: 'latest' })).toThrow(
          /Refusing download fallback/
        );
        expect(readFileSync(join(existingBundle, 'aioncore.exe'), 'utf8')).toBe('preserved');
        expect(networkExec).not.toHaveBeenCalled();
        expect(networkFileExec).not.toHaveBeenCalled();
        expect(existsSync(join(existingBundle, 'manifest.json'))).toBe(false);
      } finally {
        if (previous === undefined) delete process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR;
        else process.env.AIONUI_BACKEND_LOCAL_BUNDLE_DIR = previous;
        rmSync(tmp, { recursive: true, force: true });
      }
    }
  );
});

describe('Maestroid Core download source', () => {
  it.each([
    [undefined, undefined, 'KangDohwa/Maestroid-Core'],
    ['sample-owner', 'sample-core', 'sample-owner/sample-core'],
  ])('uses owner %s and repo %s without an implicit upstream fallback', (owner, repo, expected) => {
    const previousOwner = process.env.AIONUI_BACKEND_GITHUB_OWNER;
    const previousRepo = process.env.AIONUI_BACKEND_GITHUB_REPO;
    if (owner === undefined) delete process.env.AIONUI_BACKEND_GITHUB_OWNER;
    else process.env.AIONUI_BACKEND_GITHUB_OWNER = owner;
    if (repo === undefined) delete process.env.AIONUI_BACKEND_GITHUB_REPO;
    else process.env.AIONUI_BACKEND_GITHUB_REPO = repo;
    try {
      expect(getDownloadUrl('aioncore-v0.0.1-x86_64-pc-windows-msvc.zip', 'v0.0.1')).toBe(
        `https://github.com/${expected}/releases/download/v0.0.1/aioncore-v0.0.1-x86_64-pc-windows-msvc.zip`
      );
    } finally {
      if (previousOwner === undefined) delete process.env.AIONUI_BACKEND_GITHUB_OWNER;
      else process.env.AIONUI_BACKEND_GITHUB_OWNER = previousOwner;
      if (previousRepo === undefined) delete process.env.AIONUI_BACKEND_GITHUB_REPO;
      else process.env.AIONUI_BACKEND_GITHUB_REPO = previousRepo;
    }
  });

  it('rejects invalid repository configuration', () => {
    const previous = process.env.AIONUI_BACKEND_GITHUB_OWNER;
    process.env.AIONUI_BACKEND_GITHUB_OWNER = 'owner/repo';
    try {
      expect(() => getDownloadUrl('asset.zip', 'v0.0.1')).toThrow(/Invalid AionCore GitHub/);
    } finally {
      if (previous === undefined) delete process.env.AIONUI_BACKEND_GITHUB_OWNER;
      else process.env.AIONUI_BACKEND_GITHUB_OWNER = previous;
    }
  });
});
