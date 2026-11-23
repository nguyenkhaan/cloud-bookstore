# Backend Service Folders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize backend service files into `Configurations` and `Infrastructure` while preserving behavior and a green backend build/test suite.

**Architecture:** Configuration binding models move to `backend.src.Configurations`; external SMTP/Redis and health-check implementations move to `backend.src.Infrastructure`. Application services and email interfaces remain in `backend.src.Services`.

**Tech Stack:** .NET 10, ASP.NET Core, xUnit

**Spec:** `docs/superpowers/specs/2026-10-26-backend-service-folders-design.md`

## Global Constraints

- Add at most two folders directly under `app/backend/src`.
- Preserve behavior, public signatures, and DI lifetimes.
- Add no dependencies and make no unrelated cleanup.

## Review Focus

- Every moved type must remain resolvable by production consumers and tests.
- Dependency-injection registrations must still resolve the same implementations.
- Backend build and the complete backend test suite must finish with zero errors.

---

### Task 1: Reorganize backend service files

**Files:**
- Create/move: `app/backend/src/Configurations/*.cs`
- Create/move: `app/backend/src/Infrastructure/*.cs`
- Modify: `app/backend/Program.cs`
- Modify: relevant consumers under `app/backend/src` and `app/backend.Tests`

**Interfaces:**
- Consumes: existing service type names and public signatures.
- Produces: the same types under namespaces matching the two new folders.

- [ ] **Step 1: Verify the current test project fails on inconsistent service namespaces**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --no-restore`

Expected: FAIL with missing `backend.src.Services.Email` or `backend.src.Services.Authentication` namespaces.

- [ ] **Step 2: Move configuration and infrastructure files and update namespaces/imports**

Keep `AuthService`, `TokenService`, `SettingService`, `IEmailService`, and `IEmailHealthCheck` in `backend.src.Services`.

- [ ] **Step 3: Run the complete backend test suite**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --no-restore`

Expected: PASS with zero failed tests and zero compile errors.

- [ ] **Step 4: Build the backend project**

Run: `dotnet build app/backend/backend.csproj --no-restore`

Expected: Build succeeded with zero errors.
