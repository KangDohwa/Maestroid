# Maestroid-Core 연동 준비

작성일: 2026-10-05. 상태: 저장소 설정 완료, 코드 연결 전 조사·설계.

Maestroid는 별도 사용자 Fork인 **Maestroid-Core**를 개발·패키징 대상으로 사용한다. 초기 기준은 UI `v2.2.2`가 지정한 Core `v0.2.2`다. 기존 환경변수로 로컬 빌드 산출물을 연결할 수 있지만, 현재 앱 코드는 여전히 원본 AionCore 릴리스 다운로드를 기본으로 한다. 이번 작업에서는 Git 설정과 이 문서만 변경했다.

이 문서는 로컬 참고 자료(저장소 미포함)인 `docs/research/aionui-and-quota.md`와 `docs/research/aionui-team-creation.md`, 그리고 [UI upstream 기록](UPSTREAM.md)을 참고했다. 로컬 팀 조사 문서 9절의 “원본 Core 바이너리 유지”는 이전 결정이며, 이번 Core Fork 연동 지시가 이를 대체한다.

## 1. 저장소와 기준 버전

| 항목 | 확인한 값 |
| --- | --- |
| UI 작업 경로 | `D:\AionUi-Workspace\Maestroid` |
| Core 작업 경로 | `D:\AionUi-Workspace\Maestroid-Core` |
| Core `origin` fetch / push | `https://github.com/KangDohwa/Maestroid-Core` |
| Core `upstream` fetch | `https://github.com/iOfficeAI/AionCore` |
| Core `upstream` push | `DISABLED` |
| Core의 `gh` 기본 저장소 | `KangDohwa/Maestroid-Core` |
| Core 작업 브랜치 | `chore/maestroid-core-integration` |
| 작업 브랜치 HEAD / `v0.2.2` | `47e66d0d151123e973b3fd1e77afcb5671b3f8c5` |
| 사용자 Fork의 `main` | `4a707fc3d3cd1f06a86004745e2c1bbf08b16068` — 변경하지 않음 |
| UI의 원본 Core pin | 루트 `package.json`의 `aioncoreVersion: v0.2.2` [P1] |

처음 확인한 Core HEAD는 `main`의 `4a707fc3…`로 UI pin과 달랐다. 최초 조회 시 로컬·Fork 원격에 `v0.2.2` 태그가 없었으며, upstream에는 위 SHA의 태그가 있었다. 태그를 fetch한 뒤 리더 지시에 따라 작업 내용이 없는 브랜치만 `v0.2.2` 기준으로 재생성했다. `main` 리셋, 커밋, 푸시는 수행하지 않았다.

### `main`과 `v0.2.2`의 차이

`git diff v0.2.2 main`은 12개 파일의 차이를 보였다. 주요 차이는 direct CLI 검증 기준 상수, ACP registry 패키지 pin, MiniMax Code 추가와 DB migration `044`, 관련 자산·테스트다. [C1], [C2]

| 영역 | UI 연동에 미치는 소스상 영향 |
| --- | --- |
| 팀 DTO·REST route·모델/추론 전송 | diff 대상에 API DTO·route 파일이나 `codex_conn.rs`·`claude_conn.rs` 변경이 없다. 이번 비교에서 UI wire 계약 변경은 확인되지 않았다 |
| assistant catalog·DB | MiniMax Code 추가로 목록과 내부 metadata/migration이 달라진다. 같은 API 경로라도 catalog 내용까지 같다는 뜻은 아니다 |
| CLI 검증 기준 | Claude 상수는 `2.1.236` → `2.1.280`, Antigravity는 `1.1.28` → `1.2.14`; Codex `0.151.0`은 동일하다. 이는 upstream 코드의 기준값이며 이번 작업에서 CLI 호환성을 실행 검증한 결과가 아니다 |
| ACP runtime | registry pin과 factory의 package 선택이 달라 외부 adapter 실행 결과가 달라질 수 있다 |

UI와 Core 조합은 **manifest pin에 맞춘 선택**이다. 소스 비교만으로 실제 API·CLI 실행 호환성을 보장하지 않는다. 또한 `main`에서 만든 데이터베이스를 구버전 Core로 여는 downgrade는 수행하지 않는다.

## 2. 현재 Core 다운로드·실행 경로

### 패키징 시 다운로드

1. 루트 `package.json`의 `aioncoreVersion`을 `scripts/resolveAioncoreVersion.js`가 읽는다. 우선순위는 `AIONUI_BACKEND_VERSION` → package pin → `latest`다. [P1], [P2]
2. `scripts/prepareAioncore.js`, `scripts/build-with-builder.js`, `scripts/pack-web-cli.js`가 공유 `prepareAioncore()`를 호출한다. Windows 배포 진입점은 `bun run build-win:x64` 등이다. [P3], [P4]
3. `packages/shared-scripts/src/prepare-aioncore.js`의 `GITHUB_OWNER='iOfficeAI'`, `GITHUB_REPO='AionCore'`가 다운로드 저장소를 결정한다. `gh repo set-default`나 Git `origin` 변경은 이 상수를 바꾸지 않는다. [P5]
4. 일반 release URL은 `https://github.com/iOfficeAI/AionCore/releases/download/<tag>/<asset>`다. Windows x64 예시는 `aioncore-v0.2.2-x86_64-pc-windows-msvc.zip`이다. `AIONUI_BACKEND_RUN_ID`를 사용하면 같은 저장소의 Actions artifact를 조회한다. [P5]
5. 결과는 `resources/bundled-aioncore/<platform>-<arch>/`에 준비된다. 바이너리, `manifest.json`, `managed-resources/`가 포함된다. 바이너리 단독 경로에서는 Core의 `prepare-managed-resources`를 실행해 추가 runtime 자원을 만든다. [P5], [C3]
6. `packages/desktop/electron-builder.yml`의 `extraResources`가 이 폴더를 설치 앱의 `resources/bundled-aioncore/`로 복사한다. [P6]

### 실행 시 바이너리 선택

Electron의 `binaryResolver.ts`는 다음 순서로 찾는다. [P7]

1. `AIONUI_BACKEND_BIN`의 경로.
2. `process.resourcesPath/bundled-aioncore/<platform>-<arch>/aioncore[.exe]`.
3. 시스템 PATH의 `aioncore`.

`AIONUI_BACKEND_BIN`이 지정됐는데 파일이 없으면 fallback 대신 오류를 낸다. 지정 파일이 **어느 저장소·SHA에서 만들어졌는지**까지 검사하는 것은 아니다.

`packages/desktop/src/index.ts`가 resolver를 `BackendLifecycleManager`에 주입한다. 실제 spawn은 `packages/web-host/src/backend-launcher.ts`이며 UI가 정한 `--data-dir`, `--log-dir`, `--work-dir`, `--app-version`을 전달한다. 패키징 앱에는 `--managed-resources-mode bundled`도 전달한다. `--app-version`은 호스트 앱 버전이므로 Core source SHA와 혼동하지 않는다. [P8]

## 3. 개발 모드에서 로컬 Core 사용

**제안:** 초기에는 Cargo binary 이름 `aioncore`를 유지하고, Fork에서 빌드한 실행 파일의 절대경로만 기존 override로 지정한다. 본체의 resolver·IPC를 바꾸지 않고 연결할 수 있다. Core package는 `aionui-app`, binary target은 `aioncore`다. [C4]

다음 명령은 **후속 빌드·실행 승인 시 사용할 예시이며 이번 작업에서 실행하지 않았다.**

```powershell
Set-Location 'D:\AionUi-Workspace\Maestroid-Core'
cargo build --release -p aionui-app --bin aioncore

Set-Location 'D:\AionUi-Workspace\Maestroid'
$env:AIONUI_BACKEND_BIN = 'D:\AionUi-Workspace\Maestroid-Core\target\release\aioncore.exe'
bun run start
```

이는 native Windows target으로 빌드한 경우다. `--target x86_64-pc-windows-msvc`를 명시하면 산출물 경로에 해당 target 디렉터리가 추가되므로 override도 맞춰야 한다. Core에 별도 `CARGO_TARGET_DIR` 설정을 사용하면 실제 출력 경로를 따른다.

환경변수는 해당 PowerShell 세션에만 설정한다. 전역 PATH나 설치된 원본 AionUi 설정은 변경하지 않는다. 앱 데이터·로그 경로 격리는 본체의 Maestroid 경로 설정을 그대로 사용한다. Core를 단독 실행한다면 명시적 `--data-dir`를 사용해야 한다. Core CLI의 기본 `data` 디렉터리가 브랜드별 홈을 자동 선택하는 것은 아니다. [C5], [P8]

개발 앱은 패키징 모드의 `bundled` 인자를 넣지 않는다. Core CLI의 기본 managed-resource 모드는 `download`다. 따라서 로컬 Core 바이너리 선택과 Node runtime 등의 자원 준비는 별개다. `AIONUI_BUNDLED_MANAGED_RESOURCES`의 경로만 지정했다고 기본 모드까지 bundled로 바뀐다고 설명하지 않는다. [C5], [C6]

## 4. 배포 패키징에서 로컬 Core 사용

**권장 경로:** `AIONUI_BACKEND_LOCAL_BUNDLE_DIR`로 완성된 Fork bundle을 공급한다. 바이너리 이름과 기존 bundle 레이아웃을 유지하면 electron-builder 설정을 바꿀 필요가 없다. [P5], [P6]

```text
Maestroid-Core/target/maestroid-bundle/win32-x64/
  aioncore.exe
  managed-resources/
    manifest.json
    ...런타임 계약에 필요한 자원
```

후속 빌드 승인 후에는 다음 순서로 준비한다. [C3], [C4]

1. `v0.2.2` 기반 Core 작업 브랜치에서 대상 OS·architecture용 binary를 빌드한다.
2. binary를 별도 staging bundle에 복사한다. `cargo build`만으로 완성된 `managed-resources/`가 생긴다고 가정하지 않는다.
3. 해당 binary로 `--data-dir <별도 준비용 디렉터리> prepare-managed-resources --bundle-out <bundle>/managed-resources`를 실행한다. 이 단계는 runtime 다운로드·파일 쓰기를 발생시킬 수 있으므로 이번 작업에서는 실행하지 않았다.
4. Maestroid의 패키징 세션에서 아래 환경변수를 설정한다. 완성된 bundle은 `resources/bundled-aioncore/` 밖에 둔다. 준비 스크립트가 대상 runtime 디렉터리를 먼저 지우므로 입력·출력 경로가 같으면 안 된다.

```powershell
Set-Location 'D:\AionUi-Workspace\Maestroid'
$env:AIONUI_BACKEND_LOCAL_BUNDLE_DIR = 'D:\AionUi-Workspace\Maestroid-Core\target\maestroid-bundle\win32-x64'
$env:AIONUI_BACKEND_VERSION = 'v0.2.2'
$env:AIONUI_BACKEND_RUN_ID = ''
bun run build-win:x64
```

이 명령도 실행하지 않았다. 개발용 `AIONUI_BACKEND_BIN`은 실행할 binary를 고르며, **패키지에 포함할 binary를 고르는 설정은 아니다.** [P5], [P7]

### 실제 우선순위와 주의점

공유 스크립트 상단 주석에는 local bundle이 다운로드 뒤에 적혀 있지만, `prepareAioncore()` 본문은 tag 결정·대상 폴더 초기화 뒤 **완성된 local bundle을 먼저** 복사하고 return한다. 함수 본문을 기준으로 판단했다. [P5]

- pin을 `latest`로 비워두면 local bundle 검사 전 GitHub latest tag 조회가 발생한다. 명시적 버전을 사용한다.
- local bundle 경로·binary·`managed-resources/`가 모두 존재하면 복사하고 내부 bundle 검사 함수를 호출한다. 자원 계약 검사에 실패하면 해당 경로에서 오류로 끝난다.
- 경로나 기본 구성 요소가 빠지면 경고만 내고 Actions/release 다운로드로 넘어간다. 따라서 현재 구현은 **Fork bundle 누락 시 원본 다운로드를 막는 동작을 보장하지 않는다.**
- `AIONUI_BACKEND_LOCAL_BINARY`는 release/Actions 시도 뒤의 fallback이다. 원본 다운로드가 성공하면 그 binary가 선택되므로 Fork package 공급의 우선 경로로 쓰지 않는다.
- OS·architecture별 bundle이 필요하다. Windows x64 binary를 arm64 package에 넣는 식의 혼용은 하지 않는다.
- 자동 생성되는 바깥 `manifest.json`은 `sourceType: local-bundle`과 입력 경로를 기록하지만 Core SHA·binary hash를 검증하지 않는다. `version: v0.2.2`라는 표기는 Fork 수정 여부를 증명하지 않는다.

**향후 코드 연결 제안:** local 입력이 명시됐는데 불완전하면 바로 실패하도록 바꾸고, Fork-only 패키징에서는 원본 다운로드를 허용하지 않는 분기를 둔다. 필요할 때만 `GITHUB_OWNER/GITHUB_REPO`를 `KangDohwa/Maestroid-Core`로 바꾸어 Fork release/Actions를 사용한다. 이 경우 asset·artifact 이름과 Fork release tag도 함께 정해야 한다. 이는 미구현 제안이며 이번 문서가 빌드·릴리스·업로드 권한을 추가하지 않는다.

## 5. Core 리브랜딩 범위

| 대상·현재 위치 | 권장 처리 |
| --- | --- |
| 저장소명 | `KangDohwa/Maestroid-Core` 사용 — 이번 Git 설정에 반영 |
| `crates/aionui-app/src/cli.rs`의 CLI about·설명 | 사용자에게 보이는 `AionUi Backend Server` 등은 `Maestroid Core`로 변경할 후보 [C5] |
| `crates/aionui-app/Cargo.toml`의 `[[bin]] name=aioncore` | 초기 연결은 유지 권장. `maestroid-core`로 바꾸려면 UI resolver, prepare/verify 스크립트, web CLI, release/manual workflow와 도움말을 함께 갱신 [C4], [P5], [P7] |
| 로그 이름·메시지 | `bootstrap/tracing_init.rs`는 날짜별 `*.aioncore.log`를 쓴다. 바꾸려면 `commands/cmd_diagnose.rs`의 suffix 검색도 함께 변경. launcher의 `[aioncore]` prefix와 진단 문구도 후속 후보 [C7], [P8] |
| Core update 조회 | `aionui-system/src/version.rs`의 기본 저장소는 `iOfficeAI/AionUi`, User-Agent는 `aioncore`. 조회 저장소는 요청의 `repo` → `AIONUI_GITHUB_REPO` → 기본값 순서로 선택하므로 기존 override를 우선 검토한다. 향후 Maestroid release 정책에 맞춰 설정하거나 비활성화. UI 업데이트를 껐다고 Core endpoint의 기본값까지 바뀌지는 않는다 [C8] |
| DB·cache·확장 경로 | UI가 전달한 Maestroid data/log/work 경로를 우선 사용. `config.rs`의 `aionui-backend.db` basename은 초기에는 유지해도 부모 경로로 분리 가능. standalone 기본 경로와 legacy fallback은 별도 변경 후보 [C9], [UPSTREAM.md](UPSTREAM.md) |
| crate/module 이름 `aionui-*` | 첫 연동에는 일괄 변경하지 않는다. Cargo 의존성과 tracing target·내부 API의 광범위한 동시 변경을 피한다 |
| 저작권·SPDX·원본 LICENSE | 브랜드 치환 대상에서 제외하고 보존 |

### 유지할 연결·저장 계약

`AIONUI_*`는 UI launcher, Rust Core, helper/MCP 경로가 공유하는 연결 식별자다. 초기 Fork에서는 **이름을 유지하고 값만 Maestroid 경로로 전달**하는 방향을 권장한다. 변수명을 바꿀 필요가 생기면 생산자·소비자 전체와 기존 설정 호환 방식을 함께 정한다. [P8], [C6]

`AIONCORE_LISTENING`, `AIONCORE_READY`도 UI가 파싱하는 stdout 준비 상태 마커이므로 표시명처럼 치환하지 않는다. [P8], [C10]

`config.rs`의 암호화 key derivation prefix `aionui-encryption-key:`는 저장 계약이다. 소스 주석도 변경하면 기존 ciphertext를 잃는다고 명시한다. 리브랜딩을 이유로 변경하지 않는다. JSON 필드, REST 경로, WS event명, DB schema 식별자도 같은 기준으로 다룬다. [C9]

## 6. Fast 전달과 quota 수집을 추가할 Rust 위치

아래는 **구현 위치 제안**이다. 현재 설치된 CLI에서 Fast wire·capability·quota schema를 캡처하거나 공식 adapter/schema로 확인한 결과는 아니다. Core `AGENTS.md`가 요구한 증거를 확보하기 전에는 Fast를 낮은 effort나 임의 `service_tier` 필드로 구현하지 않는다. 이 문서의 코드 관찰은 Core의 현재 처리 범위를 뜻하며 실제 CLI 전체 기능의 부재를 뜻하지 않는다.

### Fast / 멤버별 초기 설정

| Core 경로 | 현재 확인한 처리와 확장 지점 |
| --- | --- |
| `crates/aionui-api-types/src/team.rs` | 생성·멤버 추가 DTO. `TeamAgentInputCompat`, `AddAgentRequestCompat`가 unknown field를 거부하며 전용 Fast 필드가 없다. 초기 per-slot override를 받으려면 wire DTO부터 연결 [C11] |
| `crates/aionui-team/src/provisioning.rs`, `service.rs` | assistant→conversation 구성, 모델 처리, team config option forwarding. 생성·추가·재시작의 멤버 설정 저장과 적용 위치 [C12] |
| `crates/aionui-app/src/router/team_conversation_adapters.rs` | team conversation port를 일반 conversation service의 config getter/setter로 연결. 두 도메인 경계를 유지 [C13] |
| `crates/aionui-session/src/backend/types.rs` | `Command::SetConfigOption { option_id, value }` 계약. 새 설정을 capability/catalog과 함께 다루는 위치 [C14] |
| `crates/aionui-session/src/backend/codex_conn.rs` | dispatch의 generic option 분기는 `effort/reasoning_effort/thought_level`만 처리하며 `thread/settings/update`의 `effort` frame을 만든다. 다른 option은 `CommandNotSupported`. 실제 Fast 계약 확인 뒤 별도 분기·확인·복구 경로 추가 후보 [C15] |
| `crates/aionui-session/src/backend/claude_conn.rs` | generic option도 effort 계열만 처리하고 `apply_flag_settings` frame을 구성한다. Fast transport는 해당 CLI의 확인된 계약에 맞춰 별도로 설계 [C16] |
| `crates/aionui-session/src/backend/acp_conn.rs` | 외부 ACP adapter용 연결. 실제 adapter가 광고하는 설정을 기준으로 사용; direct backend와 별도 경로로 취급 |

Fast ON/OFF와 reasoning effort는 별도 설정으로 저장한다. 전송 수락, 실제 적용 확인, 다음 턴 적용 대기, 미지원 상태를 구분하고, 복구 시에도 같은 멤버의 선택을 전달하는 방향이다. UI만 켜짐으로 저장하고 실제 Fast 적용으로 표시하지 않는다. 기존 model 저장 경로를 재사용하되 새로운 설정의 영구 저장 정책은 구현 단계에서 정한다.

### Quota

| Core 경로 | 확장 방향 |
| --- | --- |
| `aionui-session/src/backend/codex_conn.rs` | 기존 RPC reader·notification mapping에 공식 quota read/update를 연결할 후보. quota 조사 문서의 `account/rateLimits/read`, `account/rateLimits/updated`를 설치 버전의 공식 schema와 대조한 뒤 사용 |
| `aionui-session/src/backend/claude_conn.rs` | 원본 CLI stream reader에서 확인된 rate-limit 이벤트를 별도로 수집할 후보. headless에서 statusline이 실행된다고 가정하거나 OAuth usage HTTP를 기본 수집기로 넣지 않는다 |
| `aionui-session/src/backend/antigravity/` | `conn.rs`·`wire.rs`·`translate.rs`가 연결·출력 처리 위치. 독립 quota 조회가 필요하면 대화 입력과 분리된 collector를 검토. `/usage`의 안정 schema·주간 reset 등은 미확인 |
| `crates/aionui-session/src/event.rs` | 현재 `UsageDelta`는 token·cost·context 정보다. 계정 quota snapshot과 구분해 새 이벤트/별도 service 입력 계약을 설계 [C17] |
| `crates/aionui-system/src/` | 계정·provider별 quota cache와 조회 service를 둘 후보. token usage와 별도로 `observedAt`, `fetchedAt`, source, window, nullable 값, 미지원·오래됨 상태를 관리 |
| `crates/aionui-api-types/src/` | 향후 quota API/WS DTO. provider, 실제 bucket/model, window, reset, 확인된 사용률·잔여량, 상태만 노출. credential·전체 CLI 로그 제외 |
| `crates/aionui-app/src/services.rs`, `router/state.rs`, `router/routes.rs` | service 생성·주입 및 인증된 route 등록. 기존 system router/state 구조를 따라 연결 [C18] |

Core에서 읽은 `codex_conn.rs`는 `thread/tokenUsage/updated`를 `UsageDelta`로 매핑한다. 이것을 남은 5h/7d account quota로 바꿔 계산하지 않는다. Claude의 token/cost 집계도 같은 원칙이다. quota RPC/event의 설치 버전 지원, 전체 초기 snapshot 반환, 실제 인증 계정 응답은 이번 작업에서 확인하지 않았다. [C15], [C17]

화면에서는 Gemini/Antigravity를 하나의 Antigravity 섹션으로 보이더라도 수집기와 원본 bucket·계정은 구분한다. 서로 다른 quota를 더하거나 같은 계정의 quota를 두 번 합산하지 않는다. 구독 5h/7d를 반환하지 않는 서비스에 가상 창을 만들지 않는다. 자세한 field/source 판단은 `docs/research/aionui-and-quota.md`(로컬 참고 자료, 저장소 미포함)를 따른다.

새 critical flow의 로그는 구현 시 provider·조회 상태·관측 시각·안전한 오류 코드만 기록하는 방향이다. Fast 적용 실패나 quota 갱신 실패는 진단 가능하게 남기되 token·OAuth·cookie·prompt·raw response를 기록하지 않는다. 이번 문서 작업에는 로그 추가가 필요하지 않다.

## 7. 라이선스와 현재 작업의 한계

Core `v0.2.2`의 루트 `LICENSE`는 **Apache-2.0** 본문이고 `[workspace.package] license`는 **MIT**다. 초기 `main`에서도 같은 불일치를 확인했다. Cargo의 workspace metadata만으로 모든 파일이 MIT라고 결론내리거나 원본 LICENSE를 임의로 교체하지 않는다. 적용 범위와 metadata 정정 여부는 미확인으로 기록한다. [C19], [C20]

배포 준비에서는 원본 LICENSE·관련 고지를 보존하고 Fork 수정 사실을 명시한다. Apache-2.0 제4항은 라이선스 사본 제공, 수정 파일의 변경 고지, 관련 귀속 고지 보존, 원본 NOTICE가 있을 경우 해당 고지의 동봉을 요구한다. NOTICE 하나를 추가하는 것만으로 수정 파일 고지 요건까지 해결됐다고 간주하지 않는다. 제6항은 원본 상표 사용 권한을 일반적으로 부여하지 않는다. [Apache-2.0 원문](https://www.apache.org/licenses/LICENSE-2.0)

Core root NOTICE 추가 여부, Cargo metadata 정리, Rust 의존성·embedded skill·runtime 자원의 고지 동봉은 후속 배포 작업에서 다룬다. 이번 작업은 LICENSE/Cargo/code를 수정하지 않았으며 전체 의존성 라이선스 감사를 수행하지 않았다. 원본 저장소에 Issue·댓글 등으로 문의를 작성하지 않았다.

수행한 것은 원격 URL·SHA·태그 확인, upstream 추가 및 push 차단, `gh` 기본 저장소 설정, 태그 fetch, Core 작업 브랜치 구성, 소스 열람과 이 문서 작성이다. **의존성 설치·빌드·테스트·린트·타입 검사·앱/CLI 실행·계정 quota 호출·커밋·푸시·PR·Issue·릴리스는 미실행이다. 검증 미실행.** Git 상태와 source diff 확인은 실행 호환성 검증과 구분한다.

## 소스 근거

`P` 링크는 UI upstream 기준 `6744099b279b991c17e31c243f0920477bd31cb6`, `C` 링크는 Core `v0.2.2` 기준 `47e66d0d151123e973b3fd1e77afcb5671b3f8c5`다. 이번 세션에서 같은 경로의 로컬 소스를 읽었으며, Core의 주요 인용 파일은 `main`→`v0.2.2` diff에도 변경이 없었다. 본체에서는 다른 작업자의 리브랜딩 파일을 변경하지 않았다.

[P1]: https://github.com/iOfficeAI/AionUi/blob/6744099b279b991c17e31c243f0920477bd31cb6/package.json
[P2]: https://github.com/iOfficeAI/AionUi/blob/6744099b279b991c17e31c243f0920477bd31cb6/scripts/resolveAioncoreVersion.js
[P3]: https://github.com/iOfficeAI/AionUi/blob/6744099b279b991c17e31c243f0920477bd31cb6/scripts/prepareAioncore.js
[P4]: https://github.com/iOfficeAI/AionUi/blob/6744099b279b991c17e31c243f0920477bd31cb6/scripts/build-with-builder.js#L767
[P5]: https://github.com/iOfficeAI/AionUi/blob/6744099b279b991c17e31c243f0920477bd31cb6/packages/shared-scripts/src/prepare-aioncore.js#L442
[P6]: https://github.com/iOfficeAI/AionUi/blob/6744099b279b991c17e31c243f0920477bd31cb6/packages/desktop/electron-builder.yml#L108
[P7]: https://github.com/iOfficeAI/AionUi/blob/6744099b279b991c17e31c243f0920477bd31cb6/packages/desktop/src/process/backend/binaryResolver.ts
[P8]: https://github.com/iOfficeAI/AionUi/blob/6744099b279b991c17e31c243f0920477bd31cb6/packages/web-host/src/backend-launcher.ts#L197
[C1]: https://github.com/iOfficeAI/AionCore/compare/47e66d0d151123e973b3fd1e77afcb5671b3f8c5...4a707fc3d3cd1f06a86004745e2c1bbf08b16068
[C2]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-session/src/backend/cli_version.rs
[C3]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/commands/cmd_prepare_managed_resources.rs
[C4]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/Cargo.toml
[C5]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/cli.rs
[C6]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-runtime/src/managed_resources.rs
[C7]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/bootstrap/tracing_init.rs#L182
[C8]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-system/src/version.rs
[C9]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/config.rs
[C10]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/commands/cmd_server.rs#L23
[C11]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-api-types/src/team.rs#L44
[C12]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-team/src/service.rs#L1859
[C13]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/router/team_conversation_adapters.rs#L634
[C14]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-session/src/backend/types.rs#L95
[C15]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-session/src/backend/codex_conn.rs#L4491
[C16]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-session/src/backend/claude_conn.rs#L3383
[C17]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-session/src/event.rs#L325
[C18]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/crates/aionui-app/src/router/state.rs#L478
[C19]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/LICENSE
[C20]: https://github.com/iOfficeAI/AionCore/blob/47e66d0d151123e973b3fd1e77afcb5671b3f8c5/Cargo.toml#L36
