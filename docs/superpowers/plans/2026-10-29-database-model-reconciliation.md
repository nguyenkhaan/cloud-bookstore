# Database Model Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đồng bộ EF Core models, relational configuration, migration và seed với `docs/DATABASE.txt` mà không thay đổi `EmployeeModel` hoặc lịch sử migration hiện có.

**Architecture:** `DATABASE.txt` là chuẩn cho schema nghiệp vụ; các thuộc tính auth đang hoạt động trên `EmployeeModel` là phần mở rộng được giữ nguyên. Model classes mô tả dữ liệu, còn `AppDbContext` tập trung table mapping, enum conversion, column facets, foreign key và index; seed JSON dùng UUID cố định và `Seed.cs` chèn theo thứ tự phụ thuộc xác định.

**Tech Stack:** .NET 10, C# 14, Entity Framework Core 10, Npgsql/PostgreSQL, xUnit, System.Text.Json.

**Spec:** `docs/superpowers/specs/2026-10-29-database-model-reconciliation-design.md`

## Global Constraints

- Không sửa `app/backend/src/Models/EmployeeModel.cs` và không xóa `FailedLoginAttempts`, `LockoutEndUtc`, `PasswordResetTokenHash` khỏi EF model/snapshot.
- Giữ nguyên toàn bộ migration hiện có; chỉ thêm một migration tăng dần mới.
- Không drop database trong bất kỳ lệnh triển khai hoặc kiểm thử nào.
- Không đổi convention tên cột vật lý hiện tại sang snake_case.
- Các quan hệ dữ liệu lịch sử dùng `DeleteBehavior.NoAction`; không cascade-delete giao dịch.
- Không thêm package mới.

## Review Focus

- Database trống chạy toàn bộ chuỗi migration nhưng vẫn giữ đủ ba cột auth trên `employee`.
- Sách độc lập có `SeriesId = null`, còn đầu sách thuộc bộ tham chiếu đúng `book_series`.
- ISBN nullable/non-unique nhưng được index; CopyBarcode bắt buộc/unique.
- `BookCopy.RentalRate` nằm trên từng bản vật lý và `Edition.DefaultRentPrice` không còn tồn tại.
- Seed chạy theo thứ tự phụ thuộc, rollback khi có lỗi và không tạo bản ghi lặp khi chạy lại.

---

### Task 1: Pin the EF Core catalog and schema contract

**Files:**
- Create: `app/backend.Tests/Data/AppDbContextModelTests.cs`
- Modify: `app/backend/src/Models/RoleModel.cs`
- Modify: `app/backend/src/Models/MembershipTierModel.cs`
- Modify: `app/backend/src/Models/CustomerModel.cs`
- Modify: `app/backend/src/Models/SystemSettingModel.cs`
- Modify: `app/backend/src/Models/DamageLevelModel.cs`
- Modify: `app/backend/src/Models/CategoryModel.cs`
- Create: `app/backend/src/Models/BookSeriesModel.cs`
- Modify: `app/backend/src/Models/TitleModel.cs`
- Modify: `app/backend/src/Models/EditionModel.cs`
- Modify: `app/backend/src/Models/BookCopyModel.cs`
- Modify: `app/backend/src/Models/PaymentModel.cs`
- Modify: `app/backend/src/Data/AppDbContext.cs`

**Interfaces:**
- Consumes: entity definitions in `docs/DATABASE.txt`; retained auth contract on `EmployeeModel`.
- Produces: EF model containing `BookSeriesModel`, corrected CLR properties, explicit relational mappings and indexes.

- [ ] **Step 1: Write failing EF metadata tests**

Add tests that construct `AppDbContext` with SQLite options and assert literal metadata expectations: `book_series` exists; `TitleModel.SeriesId` is nullable and has a foreign key to `BookSeriesModel`; `EditionModel.TitleId` is required; `EditionModel.Isbn` has a non-unique index; `BookCopyModel.EditionId` is required; `BookCopyModel.CopyBarcode` has a unique index; `BookCopyModel.RentalRate` exists; `EditionModel.DefaultRentPrice` does not exist; `PaymentModel.CashSessionId` is nullable; `CustomerModel` facets and membership FK match the spec; the employee auth properties remain mapped.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~AppDbContextModelTests`

Expected: assertion failures because the EF metadata has no `BookSeriesModel`, `SeriesId` or `RentalRate` and still contains `DefaultRentPrice`. Use metadata lookups by entity/property name so the test project still compiles before implementation.

- [ ] **Step 3: Align non-employee model properties**

Implement the minimum property changes required by `DATABASE.txt`: defaults and facets on roles; `RankOrder`/`MaxBooks` as `short`; nullable customer email/national ID/address/flag reason, `long EligibleSpend`, and corrected lengths; decimal precision for settings/damage/discount fields; new `BookSeriesModel`; `SeriesId` and `IsActive` on titles; remove `DefaultRentPrice`; add nullable `RentalRate`; make `PaymentModel.CashSessionId` nullable; preserve all employee properties unchanged.

- [ ] **Step 4: Configure the relational model in `AppDbContext`**

Add `DbSet<BookSeriesModel>` and table mapping. Split the current one-line configuration into readable entity blocks/helpers. Configure required/optional relationships inferred from `...Id` fields, all with `DeleteBehavior.NoAction`, including category self-reference and the full catalog chain. Configure max lengths, `numeric(5,2)`/`numeric(18,4)`, JSONB columns, server defaults stated by `DATABASE.txt`, ordinary indexes, unique indexes, composite indexes and Npgsql partial indexes.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~AppDbContextModelTests`

Expected: all `AppDbContextModelTests` pass.

- [ ] **Step 6: Run the full backend tests**

Run: `dotnet test backend.sln --no-restore`

Expected: all existing and new tests pass.

### Task 2: Make seed ingestion deterministic and verifiable

**Files:**
- Create: `app/backend.Tests/Scripts/SeedTests.cs`
- Create: `app/backend/Properties/AssemblyInfo.cs`
- Modify: `app/backend/src/Scripts/Seed.cs`

**Interfaces:**
- Consumes: JSON root object keyed by physical table name.
- Produces: internal `Seed.GetTablesInDependencyOrder(JsonElement root)` yielding only present tables in a fixed dependency order and rejecting unsupported tables/non-array values.

- [ ] **Step 1: Write failing seed ordering tests**

Add literal JSON fixtures proving that input object order does not control insert order, `book_series` precedes `titles`, dependent transaction tables follow principals, unsupported tables throw `InvalidDataException`, and non-array table values throw `InvalidDataException`.

- [ ] **Step 2: Run focused seed tests and verify RED**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~SeedTests`

Expected: compilation failure because the ordered-table API does not exist.

- [ ] **Step 3: Implement deterministic seed ordering**

Replace `AllowedTables` with one dependency-ordered table list, expose the internal iterator to tests via `InternalsVisibleTo("backend.Tests")`, validate the root/table shapes, and have `RunAsync` insert using the ordered iterator while retaining migration-first, transaction rollback and `ON CONFLICT DO NOTHING` behavior.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~SeedTests`

Expected: all `SeedTests` pass.

### Task 3: Replace seed fixtures with schema-aligned data

**Files:**
- Modify: `app/backend/src/Data/data.json`
- Create: `app/backend.Tests/Data/SeedDataContractTests.cs`

**Interfaces:**
- Consumes: fixed table/column contract from Tasks 1–2.
- Produces: valid repeatable seed fixture with referentially consistent catalog and transaction rows.

- [ ] **Step 1: Write failing seed data contract tests**

Load the real `data.json` and assert: `book_series` exists; at least one title has a series and one is independent; a series owns multiple volume labels; one title has multiple editions; at least one ISBN is null or duplicated; no edition contains `DefaultRentPrice`; every copy contains a unique barcode and an edition/receipt line reference; rental-capable available/rented copies contain `RentalRate`; every foreign-key value represented in the fixture resolves to a seeded principal; book copy edition matches its receipt line edition.

- [ ] **Step 2: Run the contract tests and verify RED**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~SeedDataContractTests`

Expected: failures for missing `book_series`, missing series fields, stale `DefaultRentPrice`, missing `RentalRate`, and insufficient multi-edition fixture coverage.

- [ ] **Step 3: Update `data.json`**

Add fixed UUIDs for at least one multi-volume series, retain at least one independent title, add series/title activity fields, provide edition statements/format where useful, create multiple editions for one title (including nullable or duplicate ISBN behavior), remove all `DefaultRentPrice`, add per-copy `RentalRate`, and update dependent receipt/copy/transaction rows so every reference and amount remains coherent.

- [ ] **Step 4: Run seed contract and full tests**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~SeedDataContractTests`

Expected: all seed contract tests pass.

Run: `dotnet test backend.sln --no-restore`

Expected: all tests pass.

### Task 4: Generate and validate the incremental migration

**Files:**
- Create: `app/backend/src/Data/Migrations/<timestamp>_ReconcileDatabaseModels.cs`
- Create: `app/backend/src/Data/Migrations/<timestamp>_ReconcileDatabaseModels.Designer.cs`
- Modify: `app/backend/src/Data/Migrations/AppDbContextModelSnapshot.cs`

**Interfaces:**
- Consumes: final EF model from Task 1.
- Produces: an incremental migration that upgrades the previous snapshot and can build a blank production database through the complete migration chain.

- [ ] **Step 1: Generate the migration**

Run from repository root: `dotnet ef migrations add ReconcileDatabaseModels --project app/backend/backend.csproj --startup-project app/backend/backend.csproj --output-dir src/Data/Migrations`

Expected: one migration pair and updated snapshot; no existing migration is modified.

- [ ] **Step 2: Inspect the generated migration**

Verify it creates `book_series`, adds catalog foreign keys/indexes, removes `DefaultRentPrice`, adds `RentalRate`, alters intended non-employee facets/nullability/types, preserves auth columns, and has a reversible `Down`. Remove accidental/destructive operations not required by the approved design.

- [ ] **Step 3: Verify model and migration synchronization**

Run: `dotnet ef migrations has-pending-model-changes --project app/backend/backend.csproj --startup-project app/backend/backend.csproj`

Expected: `No changes have been made to the model since the last migration.`

- [ ] **Step 4: Build and test the complete solution**

Run: `dotnet build backend.sln --no-restore`

Expected: build succeeds with zero errors.

Run: `dotnet test backend.sln --no-build --no-restore`

Expected: all tests pass.

- [ ] **Step 5: Validate PostgreSQL migration and seed when available**

Use a disposable PostgreSQL database only if an isolated test connection is configured. Run `dotnet ef database update` and `dotnet run --project app/backend/backend.csproj -- --seed`, then query counts and catalog joins. Never point this verification at production and never drop a user database.

If PostgreSQL is unavailable, record this as an unexecuted integration check rather than claiming it passed.

### Task 5: Final review and production handoff

**Files:**
- Review: all files changed by Tasks 1–4

**Interfaces:**
- Consumes: approved design and completed diff.
- Produces: reviewed implementation plus exact non-destructive production migration/seed commands.

- [ ] **Step 1: Review the complete diff against the design**

Confirm no `EmployeeModel` edit, no old migration edit, no database-drop command, no unrelated API behavior changes, and no missing model/seed/migration artifact.

- [ ] **Step 2: Run fresh final verification**

Run separately:

- `dotnet build backend.sln --no-restore`
- `dotnet test backend.sln --no-build --no-restore`
- `dotnet ef migrations has-pending-model-changes --project app/backend/backend.csproj --startup-project app/backend/backend.csproj`

Expected: all three commands exit 0 and EF reports no pending model changes.

- [ ] **Step 3: Request independent code review**

Review the working-tree diff against this plan, fix all Critical/Important findings, and rerun Step 2 after any fix.

- [ ] **Step 4: Hand off production commands**

Provide commands that set the production connection string without printing it, run `dotnet ef database update`, and run the application once with `--seed`. Explicitly state that database drop remains the user's manual step and that seed is insert-only (`ON CONFLICT DO NOTHING`).
