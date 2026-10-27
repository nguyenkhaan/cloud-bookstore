# Implementation Plan: AUTH-001 — Phiên trình duyệt bằng cookie HttpOnly

## Overview

Triển khai `ADR-003` và `AUTH-001` theo lát cắt: dựng test backend không ghi đè file untracked, thêm nền cookie/CSRF và contract API, sau đó chuyển frontend sang session in-memory với refresh một lần. Mỗi bước giữ hệ thống build được và được kiểm chứng trước khi đi tiếp.

## Architecture Decisions

- JWT access/refresh vẫn dùng Redis JTI store; browser nhận chúng qua cookie HttpOnly, không phải JSON hoặc storage.
- Cookie access được đọc trước Bearer; Bearer chỉ được xét khi access cookie không tồn tại.
- CSRF là synchronizer token do BE phát hành qua JSON, FE chỉ giữ trong memory và gửi qua `X-CSRF-Token` cho unsafe cookie request.
- Refresh rotation tạo cặp token/JTI mới, vô hiệu cặp cũ, và FE chỉ retry request gốc một lần.
- CORS credentialed dùng danh sách origin cấu hình rõ ràng, không có wildcard.

## Dependency Graph

```text
T01 test backend ownership
  └─ T02 cookie/CSRF/authentication foundation
       └─ T03 login/session/refresh/logout contract
            ├─ T04 FE credential + CSRF transport
            │    └─ T05 FE session bootstrap/refresh/route guard
            └─ T06 OpenAPI regeneration + contract regression
```

## Tasks

## Task AUTH-001-T01: Thiết lập bề mặt test backend không ghi đè file untracked

**Description:** Xác định với chủ sở hữu cách dùng `app/backend.Tests/` đang untracked, hoặc tạo test project tách biệt và thêm vào solution. Tạo fixture tối thiểu để kiểm thử request cookie, JWT source selection, Redis/JTI giả lập và CORS mà không dùng secret thật.

**Acceptance criteria:**

- [ ] `dotnet test backend.sln` thực thi ít nhất một test backend.
- [ ] Không thay đổi hay xóa `app/backend.Tests/Controllers/HealthControllerTests.cs` khi chưa có xác nhận chủ sở hữu.
- [ ] Test fixture không in JWT, cookie, CSRF token hoặc secret vào output.

**Verification:**

- [ ] `dotnet restore backend.sln`
- [ ] `dotnet test backend.sln --no-build`

**Dependencies:** None.

**Files likely touched:** `backend.sln`, test project mới hoặc đã được chủ sở hữu cho phép, test fixture.

**Estimated scope:** Medium.

## Task AUTH-001-T02: Dựng nền cookie, CSRF và chọn nguồn access token

**Description:** Thêm cấu hình `AuthCookies`/origin, helper phát–xóa cookie, Redis-backed CSRF session và JWT bearer selector cookie-before-header. Thêm origin/CSRF validation cho unsafe cookie-authenticated request.

**Acceptance criteria:**

- [ ] Cookie production dùng `HttpOnly`, `Secure`, `SameSite=None`, path và lifetime tối thiểu theo ADR.
- [ ] Cookie access hợp lệ được ưu tiên hơn bearer; bearer chỉ chạy khi cookie access vắng mặt.
- [ ] Unsafe request dùng cookie thiếu/sai CSRF bị `403`, còn bearer-only request không bị yêu cầu CSRF.

**Verification:**

- [ ] Focused backend auth/security tests pass.
- [ ] `dotnet build backend.sln --no-restore`

**Dependencies:** AUTH-001-T01.

**Files likely touched:** `app/backend/Program.cs`, `src/Configurations/*`, `src/Infrastructure/*`, backend auth tests.

**Estimated scope:** Medium.

## Task AUTH-001-T03: Chuyển login, session, refresh và logout sang contract cookie

**Description:** Sửa auth service/controller/DTO để login và refresh set cookie + trả CSRF token, session trả CSRF token, logout đọc refresh cookie và xoá cookie. Thêm refresh rotation và cập nhật OpenAPI annotations/response contracts ở backend.

**Acceptance criteria:**

- [ ] Login/refresh response không có access hoặc refresh JWT trong JSON.
- [ ] Refresh thay thế JTI cũ bằng cặp token mới; login/session/refresh cung cấp CSRF token hợp lệ.
- [ ] Logout không nhận refresh token trong body, revoke được cặp session và luôn expire cookie.

**Verification:**

- [ ] Focused backend auth controller/service tests pass.
- [ ] OpenAPI local có operations/response shape mới.

**Dependencies:** AUTH-001-T02.

**Files likely touched:** `src/Controllers/AuthController.cs`, `src/Services/AuthService.cs`, `src/Dto/AuthDto/*`, `src/Infrastructure/TokenJtiStore.cs`, backend auth tests.

**Estimated scope:** Medium.

## Checkpoint AUTH-001-CP1: Backend contract an toàn

- [ ] Cookie/bearer precedence, CSRF rejection, refresh rotation và logout revocation có evidence test.
- [ ] Backend build/test pass không lộ credential trong output.
- [ ] OpenAPI khớp contract trong `AUTH-001`.

## Task AUTH-001-T04: Chuyển Axios sang credentialed request và CSRF memory state

**Description:** Bật `withCredentials`, giữ CSRF token trong module memory, tự đính header cho unsafe request, và triển khai single-flight refresh/retry không lặp. Cập nhật service/hook type theo response cookie session.

**Acceptance criteria:**

- [ ] Mọi request API browser mang credentials; unsafe request mang CSRF header khi có session.
- [ ] Một `401` chỉ kích hoạt một refresh và một retry request gốc; refresh/login không tự retry.
- [ ] Auth service không giữ access token module-scoped và không gửi refresh token JSON.

**Verification:**

- [ ] Focused `auth-api` tests pass.
- [ ] `bun run lint` và `bun run build` pass.

**Dependencies:** AUTH-001-T03.

**Files likely touched:** `app/frontend/src/api/client.ts`, `src/features/auth/auth.service.ts`, `src/features/auth/auth.hook.ts`, `src/features/auth/auth.type.ts`, `tests/auth-api.test.mjs`.

**Estimated scope:** Medium.

## Task AUTH-001-T05: Chuyển AuthProvider và route guard sang session in-memory

**Description:** Bootstrapping session bằng endpoint session, xoá `localStorage` token storage, xử lý refresh failure/logout, và bảo vệ route theo trạng thái session thay vì giải mã access JWT ở frontend.

**Acceptance criteria:**

- [ ] Reload hợp lệ gọi session và khôi phục UI session mà không lưu token browser-side.
- [ ] Refresh failure/logout xoá state trong memory và route về login với `next` an toàn.
- [ ] Không còn import/runtime dependency vào auth storage hoặc decode access JWT cho authorization UI.

**Verification:**

- [ ] Focused auth session/storage/route tests pass.
- [ ] Browser check: localStorage không chứa auth token sau login, reload và logout.

**Dependencies:** AUTH-001-T04.

**Files likely touched:** `app/frontend/src/context/*`, `src/routes/AppRoutes.tsx`, `src/features/auth/{session,auth.storage}.ts`, route/storage tests.

**Estimated scope:** Medium.

## Task AUTH-001-T06: Regenerate contract và chạy regression liên tầng

**Description:** Regenerate OpenAPI TypeScript contract từ backend đang chạy, rà diff contract, cập nhật docs/API test artifact nếu có, rồi chạy toàn bộ gates frontend/backend và browser flow.

**Acceptance criteria:**

- [ ] Generated contract phản ánh response không-token cho login/refresh/session/logout.
- [ ] Không còn `accessToken`, `refreshToken` hoặc auth storage trong frontend production source ngoài fixture/test migration cần thiết.
- [ ] Contract/API/browser evidence phân biệt rõ test local, mock và runtime thật.

**Verification:**

- [ ] `dotnet test backend.sln --no-build`
- [ ] `cd app/frontend && bun run test && bun run lint && bun run build`
- [ ] `git diff --check` và manual browser/network verification của login → reload → refresh → logout.

**Dependencies:** AUTH-001-T05.

**Files likely touched:** `app/frontend/src/contract/api-contract.ts`, frontend tests/docs, API test artifact nếu dự án đã có.

**Estimated scope:** Medium.

## Checkpoint AUTH-001-CP2: Hoàn tất feature

- [ ] Toàn bộ acceptance criteria trong `AUTH-001` pass.
- [ ] Backend + frontend quality gates pass.
- [ ] Browser evidence xác nhận cookie attributes, CSRF, refresh one-shot và không còn token storage.
- [ ] Review CORS/origin production configuration trước deploy.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `app/backend.Tests/` untracked | High | Không sửa file hiện có; cần xác nhận ownership trước T01 hoặc tạo project tách biệt. |
| Production origin chưa xác định | High | Dùng config allowlist; không deploy trước khi giá trị thật được review. |
| CORS credentialed sai cấu hình | High | Exact origin test + preflight assertion; không dùng wildcard. |
| Refresh storm/race | Medium | FE single-flight + retry marker; BE refresh rotation/JTI revoke. |
| CSRF token lộ log/storage | High | Memory-only FE, redaction/no logging, fixture giả. |

## Open Questions

- Cần chỉ định chủ sở hữu hoặc cho phép adopt `app/backend.Tests/` đang untracked trước T01.
- Production frontend origin list và mốc bỏ Bearer fallback vẫn là P1 trước release, không chặn local implementation.
