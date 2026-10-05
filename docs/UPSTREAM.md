# Maestroid upstream 기준

기준 확인일: 2026-10-05. 사용자 Fork의 Git 이력을 유지하며 필요한 upstream 변경만 선별 반영한다.

## 저장소와 버전

| 항목 | 고정 기준 |
| --- | --- |
| 사용자 Fork / `origin` | <https://github.com/KangDohwa/Maestroid> |
| UI 원본 / `upstream` | <https://github.com/iOfficeAI/AionUi> |
| AionUi 안정 릴리스 | [`v2.2.2`](https://github.com/iOfficeAI/AionUi/releases/tag/v2.2.2) |
| Fork `main`과 UI 기준 커밋 | [`6744099b279b991c17e31c243f0920477bd31cb6`](https://github.com/iOfficeAI/AionUi/commit/6744099b279b991c17e31c243f0920477bd31cb6) — 연결 시 서로 일치 |
| 작업 브랜치 | `chore/maestroid-rebrand` |
| AionCore 원본 | <https://github.com/iOfficeAI/AionCore> |
| 원본 backend pin | `package.json`의 `aioncoreVersion: v0.2.2` 유지 |
| AionCore 릴리스 커밋 | [`47e66d0d151123e973b3fd1e77afcb5671b3f8c5`](https://github.com/iOfficeAI/AionCore/commit/47e66d0d151123e973b3fd1e77afcb5671b3f8c5) |

UI 릴리스가 명시한 backend pin으로 조합을 선택했다. 설치·빌드·실행으로 호환성을 확인한 결과는 아니다. 기존 조사 문서의 AionCore `main` SHA `4a707fc3d3cd1f06a86004745e2c1bbf08b16068`와 실제 `v0.2.2` 태그 SHA를 구분한다.

`origin/main`의 커밋 이력을 가져와 루트에 기존 AionUi 구조를 유지했다. Git fetch에는 `--filter=blob:none --no-tags`를 사용했으며 얕은 이력으로 자르지 않았다. 이 1차 리브랜딩 작업에서는 AionCore 소스를 루트나 `core/`에 편입하지 않았다. 원본 릴리스 바이너리 준비 경로와 `packages/shared-scripts/src/prepare-aioncore.js`를 유지한다. 별도 Core 저장소 구성과 향후 연결 계획은 [core-integration.md](core-integration.md)에서 관리한다. 기존 `design/`, `docs/` 파일은 경로 충돌 없이 보존했다.

`upstream`은 조회·fetch 전용이고 push URL은 `DISABLED`다. iOfficeAI 소유 저장소에는 PR·Issue·댓글·push·태그·릴리스 등 쓰기 작업을 하지 않는다. 사용자 Fork에도 별도 지시 전 커밋·푸시하지 않는다.

## 라이선스와 고지

- AionUi 원본 [`LICENSE`](https://github.com/iOfficeAI/AionUi/blob/6744099b279b991c17e31c243f0920477bd31cb6/LICENSE)와 소스 copyright/SPDX 고지를 보존한다. 이 기준 커밋에는 루트 `NOTICE`가 없으므로 Maestroid 파생·수정 고지를 새 `NOTICE`에 추가했다. 데스크톱 패키징 파일 목록에 `LICENSE`와 `NOTICE`를 포함했다.
- AionCore [`LICENSE`](https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/LICENSE)는 **Apache-2.0** 본문이다. 같은 커밋의 [`Cargo.toml`](https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/Cargo.toml) `[workspace.package] license`는 **MIT**다. 불일치를 그대로 기록하며 어느 하나로 임의 통일하지 않는다. 적용 범위 해석은 미확인이다.
- 원본 backend와 번들 의존성·스킬·자산의 고지 조건도 적용된다. 이번 작업은 전체 의존성 및 배포물의 라이선스 감사를 수행하지 않았다.

## 1차 리브랜딩

| 대상 | 변경 |
| --- | --- |
| `package.json`, `bun.lock` | package 이름 `maestroid`, 표시명 `Maestroid`, Fork author/repository/homepage/bugs metadata; 버전·의존성·backend pin 유지 |
| `packages/desktop/electron-builder.yml` | app ID `io.github.kangdohwa.maestroid`, 실행/설치 이름 `Maestroid`, `maestroid` protocol, Linux launcher metadata, GitHub publish `KangDohwa/Maestroid`; auto-update metadata publish 비활성 |
| `process/startup/windowsAppUserModelId.ts`, `scripts/afterPack.js`, `scripts/build-with-builder.js` | Windows runtime AppUserModelID와 패키징 실행 파일 경로를 같은 Maestroid 식별자로 연결 |
| `common/platform/index.ts`, `process/utils/configureChromium.ts` | release `Maestroid`, dev `Maestroid-Dev`, multi-instance dev `Maestroid-Dev-2`; storage의 조기 초기화에도 같은 격리 적용; 명시적 E2E sandbox 존중 |
| `common/platform/NodePlatformServices.ts` | fallback server 디렉터리 `~/.maestroid-server` |
| `process/utils/utils.ts` | 데이터 하위 디렉터리 `maestroid`, 임시 디렉터리 `maestroid`, macOS symlink `~/.maestroid*` / `~/.maestroid-config*` |
| `process/utils/initStorage.ts` | 기존 AionUi temp 데이터를 복사·삭제하는 자동 import 제거; 격리된 Maestroid 트리 내부의 backend schema migration은 유지 |
| `scripts/webui.ts`, `scripts/resetpass.ts`, `packages/web-cli/src/index.ts` | 기본 WebUI 데이터 `~/.maestroid-web`, dev `~/.maestroid-web-dev[-2]`; 명시적 CLI/env override 계약 유지 |
| `process/utils/deepLink.ts` | `maestroid://` 등록·파싱 |
| `process/services/updateFeed.ts`, `autoUpdaterService.ts`, `process/bridge/updateBridge.ts` | `AUTO_UPDATES_ENABLED = false`; 자동/수동 검사·다운로드·설치 비활성; 예약 feed와 repo를 Maestroid로 설정 |
| `renderer/components/layout/DocumentTitle.tsx`, `renderer/index.html`, `public/manifest.webmanifest`, 13개 locale의 `login.json` | 기존 `login.brand` / `login.pageTitle` 키를 재사용해 창·로그인·PWA 표시명을 Maestroid로 설정; 키 추가 없음 |

표의 `common/`, `process/`, `renderer/`는 `packages/desktop/src/` 아래다. 원저작권 주석, `@aionui/*` workspace import, `AIONUI_*` 환경변수, 내부 IPC/HTTP marker, 격리된 트리 내부의 legacy filename과 backend DB filename은 유지했다. 아이콘·로고 자산은 변경하지 않았다.

## AionCore 경로 격리의 근거와 경계

UI의 `packages/desktop/src/index.ts`는 `backendManager.start(getDataPath(), logDir, dirs)`로 Maestroid 디렉터리를 전달한다. `packages/web-host/src/backend-launcher.ts`의 `buildSpawnArgs`는 `--data-dir`, `--log-dir`, `--work-dir`를, `buildSpawnEnv`는 `AIONUI_CACHE_DIR`, `AIONUI_WORK_DIR`, `AIONUI_LOG_DIR`를 넘긴다.

고정한 AionCore 소스에서 확인한 연결은 다음과 같다.

- [`config.rs`](https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/config.rs)의 `database_path()`는 전달받은 `data_dir/aionui-backend.db`를 사용한다. 파일명에 원본 이름이 남아 있어도 부모 디렉터리는 Maestroid다.
- [`main.rs`](https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/main.rs)는 `aionui_runtime::init(&cli.data_dir)`를 호출하며, [`cache.rs`](https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-runtime/src/cache.rs)는 managed runtime을 `{data_dir}/runtime`에 둔다.
- [`router/state.rs`](https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/router/state.rs)는 assistant rule, skill, extension 설정에 `services.data_dir`를 넘긴다.
- [`loader.rs`](https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-extension/src/loader.rs)의 `~/.aionui/extensions` fallback은 명시적 data dir가 없을 때만 적용된다. legacy sibling 스캔은 data dir의 마지막 이름이 `aionui`일 때만 추가되며, Maestroid의 `maestroid` 디렉터리에서는 추가되지 않는다.
- [`sysinfo.rs`](https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-system/src/sysinfo.rs)의 platform `aionui` fallback보다 UI가 주입하는 `AIONUI_{CACHE,WORK,LOG}_DIR` 값이 우선한다.

따라서 기본 UI/WebUI 실행 경로의 앱 DB·설정·managed runtime 분리를 위해 AionCore를 수정할 필요는 없다는 **소스상 판단**이다. 실제 프로세스를 실행해 입증한 결과는 아니다. 원본 Core를 UI 밖에서 기본 인자만으로 실행하면 upstream fallback은 남아 있다. 사용자가 `--data-dir`, `AIONUI_DATA_DIR`, `AIONUI_EXTENSIONS_PATH` 등의 경로를 명시하면 그 경로를 계속 존중한다. Codex·Claude 등 원본 CLI의 인증 디렉터리와 사용자가 선택한 공용 스킬·작업 폴더는 별개이며 자동으로 복제·격리하지 않는다.

## 남은 작업과 상태

- 아이콘·로고, tray/설정/도움말 등 나머지 AionUi 문구, README, 서비스 지원·분석 endpoint, standalone CLI 배포 이름은 후속 리브랜딩 대상이다.
- 업데이트는 의도적으로 꺼져 있다. 예약 GitHub URL에 기존 CDN manifest/provider를 그대로 켜면 사용할 수 있다는 뜻이 아니다. Maestroid 릴리스·서명·metadata를 준비하고 GitHub provider 또는 호환 feed를 구성한 뒤 검사·다운로드·설치를 다시 연결해야 한다.
- 기존 upstream 테스트의 브랜드·경로·update 기대값은 이번 변경과 달라질 수 있다. 테스트 작성/갱신·설치·빌드·린트·타입 검사·실행·시각 검증은 수행하지 않았다. **검증 미실행**.
- 커밋·푸시·PR·Issue·릴리스 작업은 수행하지 않았다. 소스 변경은 작업 트리에만 있다.
- 이전 소스 import 임시 폴더 `C:\Users\myori\AppData\Local\Temp\maestroid-import-d86bdca24c504f1294604dd693a07b46` 삭제는 자동 승인 검토가 `blocked by policy`로 거부해 보존되어 있다.
