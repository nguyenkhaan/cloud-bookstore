# Cloudinary Direct Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MinIO and Attachment persistence with backend-signed Cloudinary direct uploads, persisted UploadIntents, and direct public-image references on book domain entities.

**Architecture:** The frontend asks `POST /api/uploads/signature` for a server-owned Cloudinary upload signature, uploads bytes directly to Cloudinary, then includes the upload response in a BookSeries/Title/Edition/BookCopy Create or Update request. `CloudinaryService` owns Cloudinary policy and cryptographic operations; `UploadIntentService` creates and consumes the single-use record. Domain entities store only `PublicImageId` and their read DTOs expose `ImageUrl` built after EF materializes database results.

**Tech Stack:** .NET 10, ASP.NET Core, EF Core 10/Npgsql, CloudinaryDotNet, xUnit, PostgreSQL, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-11-03-cloudinary-direct-upload-design.md`

## Global Constraints

- Do not create a generic Attachment or MediaAsset replacement table.
- `UploadIntentModel` contains only `Id`, `OwnerType`, `PublicImageId`, `Status`, `CreatedBy`, `CreatedAt`, `CompletedAt`, `AssetId`, `Format`, and `Bytes`; it must not persist OwnerId, Version, DeliveryType, Width, or Height.
- `CloudinaryService` is the sole holder of `ApiSecret` and must derive access policy, public ID, and Cloudinary folder exclusively from `UploadOwnerType` and the configured `RootFolder`.
- Only JPEG, PNG, and WebP uploads up to 10 MB are accepted through Cloudinary signed upload presets; PDF is unsupported.
- BookSeries, Title, Edition, and BookCopy each store one nullable `PublicImageId` and return `ImageUrl`, never their public ID, in normal read DTOs.
- RentalLineImage and StockReceiptImage schema/mappings are in scope, but their API and services are explicitly deferred; the signature endpoint rejects their owner types in this release.
- Private evidence uses Cloudinary `authenticated` delivery type and signed URLs without expiry in this release.
- All three staff roles may manage implemented image operations; do not broaden unrelated book data-edit authorization merely to support image operations.
- No Attachment/MinIO data is migrated; historical migrations stay untouched and one new migration makes the destructive schema change.
- Database updates happen before Cloudinary asset deletion; failed deletes become structured warnings for a later cleanup worker.
- Keep test coverage focused on the new security and persistence paths; do not expand unrelated legacy test coverage.

## Review Focus

- A caller supplies another actor's pending intent: reject before changing the entity or intent; covered by Task 3 `ConsumeAsync_rejects_intent_owned_by_another_actor`.
- A Cloudinary response carries a mismatched public ID or response signature: reject it and retain `PENDING`; covered by Task 3 `ConsumeAsync_rejects_untrusted_cloudinary_response`.
- A caller requests a RentalLine/StockReceipt signature before their domain APIs exist: return a client error and create no intent; covered by Task 3 `CreateSignature_rejects_deferred_evidence_owner_types`.
- A direct image replacement succeeds in PostgreSQL but destruction of its old Cloudinary asset fails: retain the new ID and emit a warning; covered by Task 4 `ReplaceImage_keeps_new_reference_when_destroy_fails`.
- A book entity is deleted with a public image: remove the database entity first and attempt the derived public Cloudinary destroy afterward; covered by Task 5 `DeleteBookCopy_removes_public_asset_after_database_commit`.

---

## Dependency graph

```text
Task 1 (test harness + persistence model)
  └─> Task 2 (Cloudinary configuration/service)
        └─> Task 3 (UploadIntent signature endpoint)
              ├─> Task 4 (BookSeries + Title image workflows)
              └─> Task 5 (Edition + BookCopy image workflows)
                    └─> Task 6 (remove Attachment/MinIO + final verification)
                          └─> Task 7 (audit complete backend logic)
```

## File structure

| Area                        | Files                                                                                                         | Responsibility                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Test harness                | `app/backend.Tests/backend.Tests.csproj`, `backend.sln`                                                   | Make focused xUnit tests executable alongside the existing SeedTests source.                 |
| Cloudinary configuration    | `src/Configurations/CloudinarySettings.cs`, appsettings, `backend.csproj`                                 | Validate Cloudinary credentials/presets and add the supported SDK.                           |
| Cloudinary provider         | `src/Infrastructure/ICloudinaryService.cs`, `CloudinaryService.cs`                                        | Owner policy, upload signatures, response verification, URL creation, destroy operations.    |
| Upload intent               | `src/Models/UploadIntentModel.cs`, enums, Upload DTOs, `UploadIntentService.cs`, `UploadsController.cs` | Persist and consume one-time upload authorization without a polymorphic attachment relation. |
| Book images                 | Four book models, DTOs, services, controllers                                                                 | Persist one public ID per entity and expose resolved image URLs.                             |
| Deferred evidence schema    | `RentalLineImageModel.cs`, `StockReceiptImageModel.cs`                                                    | Establish FK-backed tables only; no API/service in this release.                             |
| Persistence/runtime cleanup | `AppDbContext.cs`, `Program.cs`, migrations, MinIO/Attachment files, Docker/appsettings                   | Make the replacement schema deployable, then retire MinIO/Attachment runtime code.           |

### Task 1: Establish executable focused tests and the replacement persistence model

**Files:**

- Create: `app/backend.Tests/backend.Tests.csproj`
- Create: `app/backend.Tests/Infrastructure/DatabaseModelTests.cs`
- Create: `app/backend/src/Models/UploadIntentModel.cs`
- Create: `app/backend/src/Models/RentalLineImageModel.cs`
- Create: `app/backend/src/Models/StockReceiptImageModel.cs`
- Create: `app/backend/src/Models/Enums/UploadOwnerType.cs`
- Create: `app/backend/src/Models/Enums/UploadIntentStatus.cs`
- Modify: `backend.sln`
- Modify: `app/backend/backend.csproj`
- Modify: `app/backend/src/Models/BookSeriesModel.cs`
- Modify: `app/backend/src/Models/TitleModel.cs`
- Modify: `app/backend/src/Models/EditionModel.cs`
- Modify: `app/backend/src/Models/BookCopyModel.cs`
- Modify: `app/backend/src/Data/AppDbContext.cs`
- Modify: `app/backend/src/Services/EditionService.cs`
- Modify: `app/backend/src/Services/TitleService.cs`
- Modify: `app/backend/src/Services/BookCopyService.cs`
- Modify: `app/backend/src/Dto/EditionDto/EditionMappingExtensions.cs`
- Create: `app/backend/src/Data/Migrations/<timestamp>_ReplaceAttachmentsWithCloudinaryImages.cs`
- Create: `app/backend/src/Data/Migrations/<timestamp>_ReplaceAttachmentsWithCloudinaryImages.Designer.cs`
- Modify: `app/backend/src/Data/Migrations/AppDbContextModelSnapshot.cs`

**Interfaces:**

- Consumes: Existing `AppDbContext.Reference<TDependent, TPrincipal, TKey>` relationship helper and the current book/RentalLine/StockReceipt models.
- Produces: `UploadOwnerType`, `UploadIntentStatus`, `UploadIntentModel`, `RentalLineImageModel`, `StockReceiptImageModel`, and nullable `PublicImageId` fields used by Tasks 2–6.

**Acceptance Criteria:**

- `dotnet test backend.sln` discovers the existing `SeedTests` and new focused tests.
- EF maps the three new tables, uses string enum conversion, gives UploadIntent a unique public-image index, and maps evidence tables with required `NoAction` FKs.
- UploadIntent has exactly the fields permitted by the global constraint; Edition no longer has `CoverImageUrl` in the model.
- The checked-in destructive migration drops `attachments`, drops `edition.CoverImageUrl`, and creates only the replacement columns/tables; it is not applied automatically.

- [x] **Step 1: Create an xUnit test project and add it to the solution**

Create `app/backend.Tests/backend.Tests.csproj` targeting `net10.0`, reference `../backend/backend.csproj`, include xUnit/Microsoft.NET.Test.Sdk/runner packages and EF Core InMemory for model/service tests, then add it to `backend.sln`.

- [x] **Step 2: Write failing EF model tests in `app/backend.Tests/Infrastructure/DatabaseModelTests.cs`**

Test that the EF model exposes `UploadIntentModel`, `RentalLineImageModel`, and `StockReceiptImageModel`; that `PublicImageId` exists on all four book models; that UploadIntent omits `OwnerId`, `Version`, `DeliveryType`, `Width`, and `Height`; and that the two evidence FK delete behaviors are `NoAction`.

- [x] **Step 3: Run the focused test to verify it fails**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~DatabaseModelTests`

Expected: FAIL because the models and mappings do not exist yet.

- [x] **Step 4: Add the replacement entity/enum model and EF mappings**

Implement the three models and two enums listed above. Add `PublicImageId` to BookSeries, Title, Edition, and BookCopy; remove `EditionModel.CoverImageUrl`. Add DbSets, table names, default timestamps, unique indexes, enum-as-string configuration, and NoAction FK mappings in `AppDbContext`.

`UploadIntentModel` must expose only:

```csharp
Guid Id, UploadOwnerType OwnerType, string PublicImageId,
UploadIntentStatus Status, Guid CreatedBy, DateTime CreatedAt,
DateTime? CompletedAt, string? AssetId, string? Format, long? Bytes
```

Update any Edition/Title/BookCopy read projections and mappers that must compile because the persistence property was renamed. The existing `CoverImageUrl` request/response contract remains a temporary compatibility seam only until Task 5 replaces it with verified `ImageUpload`/`ImageUrl` contracts.

- [x] **Step 5: Generate and inspect the destructive replacement migration**

Run:

```bash
dotnet ef migrations add ReplaceAttachmentsWithCloudinaryImages --project app/backend --startup-project app/backend --output-dir src/Data/Migrations
```

Review both `Up` and `Down`: `Up` must drop `attachments` and `edition.CoverImageUrl`, then add the four direct image-ID columns and three replacement tables. Do not run `dotnet ef database update`.

- [x] **Step 6: Run the focused model tests and build**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~DatabaseModelTests && dotnet build backend.sln`

Expected: PASS; backend compiles with the new model but no feature behavior changed yet.

- [x] **Step 7: Commit the persistence foundation**

```bash
git add backend.sln app/backend/backend.csproj app/backend.Tests app/backend/src/Models app/backend/src/Data/AppDbContext.cs
git commit -m "feat: add cloud image persistence model"
```

### Task 2: Add Cloudinary configuration and isolate provider behavior

**Files:**

- Create: `app/backend/src/Configurations/CloudinarySettings.cs`
- Create: `app/backend/src/Infrastructure/ICloudinaryService.cs`
- Create: `app/backend/src/Infrastructure/CloudinaryService.cs`
- Create: `app/backend/src/Dto/UploadDto/CloudinaryUploadSignature.cs`
- Create: `app/backend.Tests/Infrastructure/CloudinaryServiceTests.cs`
- Modify: `app/backend/backend.csproj`
- Modify: `app/backend/Program.cs`
- Modify: `app/backend/appsettings.example.json`
- Modify: `app/backend/appsettings.Development.json`

**Interfaces:**

- Consumes: `UploadOwnerType` from Task 1 and CloudinaryDotNet configuration.
- Produces: `ICloudinaryService` with `GetPolicy(UploadOwnerType)`, `CreateUploadSignature(UploadOwnerType, Guid intentId)`, `VerifyUploadResponse(string publicImageId, long version, string responseSignature)`, `BuildImageUrl(string publicImageId, UploadOwnerType)`, and `DestroyAsync(string publicImageId, UploadOwnerType, CancellationToken)` for Tasks 3–5.

**Acceptance Criteria:**

- The provider maps the four book owner types to `upload` and the two evidence owner types to `authenticated` without accepting client-controlled delivery type.
- It generates IDs as `<RootFolder>/<visibility>/<owner-segment>/<intent-id>`, signs only backend-owned upload parameters, and can verify a deterministic response signature with test credentials. In dynamic folder mode it signs the matching `asset_folder`; fixed-folder mode relies on the path embedded in `public_id`.
- App startup validates all Cloudinary settings without requiring network access.

- [x] **Step 1: Write failing provider tests in `CloudinaryServiceTests.cs`**

Cover `GetPolicy_maps_book_images_to_public_upload`, `GetPolicy_maps_evidence_to_authenticated`, `CreateUploadSignature_uses_backend_owned_public_id`, `BuildImageUrl_uses_https_and_signs_authenticated_evidence_urls`, and `VerifyUploadResponse_rejects_a_signature_for_another_public_id` using a fixed test account/secret in test configuration only.

- [x] **Step 2: Run the provider tests to verify they fail**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~CloudinaryServiceTests`

Expected: FAIL because the provider/configuration contract does not exist.

- [x] **Step 3: Add Cloudinary settings, SDK package, interface, and implementation**

Add CloudinaryDotNet to `backend.csproj`. Implement validated `CloudinarySettings` containing `CloudName`, `ApiKey`, `ApiSecret`, `RootFolder`, `FolderMode`, `PublicUploadPreset`, and `AuthenticatedUploadPreset`; bind it in `Program.cs` and register `ICloudinaryService` as a singleton. `FolderMode` defaults to `DYNAMIC`; use `FIXED` only for Cloudinary legacy fixed-folder product environments.

Implement the exact interface in `CloudinaryService`. Use a switch expression as the one owner-type-to-policy function. The signed upload payload includes the server-generated `public_id`, selected signed preset, `timestamp`, resource type `image`, server-derived delivery type, and `asset_folder` in `DYNAMIC` mode. Use a `SortedDictionary` for all signing inputs. Never accept a client parameter dictionary for signing.

- [x] **Step 4: Run provider tests and build**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~CloudinaryServiceTests && dotnet build backend.sln`

Expected: PASS; generated URLs are HTTPS and evidence URLs are signed authenticated delivery URLs.

- [x] **Step 5: Commit the Cloudinary provider boundary**

```bash
git add app/backend/backend.csproj app/backend/Program.cs app/backend/appsettings.example.json app/backend/appsettings.Development.json app/backend/src/Configurations app/backend/src/Infrastructure app/backend/src/Dto/UploadDto app/backend.Tests/Infrastructure/CloudinaryServiceTests.cs
git commit -m "feat: add Cloudinary provider"
```

### Task 3: Deliver signed upload intents through the authenticated backend API

**Files:**

- Create: `app/backend/src/Dto/UploadDto/UploadSignatureRequest.cs`
- Create: `app/backend/src/Dto/UploadDto/UploadSignatureResponse.cs`
- Create: `app/backend/src/Dto/UploadDto/CloudinaryUploadResultRequest.cs`
- Create: `app/backend/src/Services/UploadIntentService.cs`
- Create: `app/backend/src/Controllers/UploadsController.cs`
- Create: `app/backend.Tests/Services/UploadIntentServiceTests.cs`
- Modify: `app/backend/Program.cs`

**Interfaces:**

- Consumes: `ICloudinaryService`, `UploadIntentModel`, `AuditLogService`, `AuditLogContext`, and the AppDbContext mapping from Tasks 1–2.
- Produces: `Task<UploadSignatureResponse> CreateSignatureAsync(Guid actorId, UploadSignatureRequest request, AuditLogContext context, CancellationToken)` and `Task<string> ConsumeAsync(Guid actorId, UploadOwnerType expectedOwnerType, CloudinaryUploadResultRequest upload, CancellationToken)`; the returned string is the verified `PublicImageId` used by Tasks 4–5.

**Acceptance Criteria:**

- `POST /api/uploads/signature` is authenticated and accepts only `OwnerType`.
- It creates one `PENDING` intent with a backend-generated unique public ID, writes `CREATE_UPLOAD_INTENT`, and returns signature parameters required by FE.
- It rejects RentalLine/StockReceipt owner types until their APIs exist, creates no intent for rejected input, and never exposes `ApiSecret`.
- Consuming requires the same actor, `PENDING` status, exact owner type/public ID, and a valid Cloudinary `public_id + version` response signature; then it stores `AssetId`, `Format`, `Bytes`, sets `COMPLETED`, and rejects reuse.

- [ ] **Step 1: Write failing intent service tests**

Use an InMemory AppDbContext and fake `ICloudinaryService`. Add tests named `CreateSignature_persists_pending_intent_for_a_book_owner`, `CreateSignature_rejects_deferred_evidence_owner_types`, `ConsumeAsync_rejects_intent_owned_by_another_actor`, `ConsumeAsync_rejects_untrusted_cloudinary_response`, and `ConsumeAsync_completes_once_and_copies_metadata`.

- [ ] **Step 2: Run the intent tests to verify they fail**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~UploadIntentServiceTests`

Expected: FAIL because the service and request contracts do not exist.

- [ ] **Step 3: Implement intent DTOs and `UploadIntentService`**

Define `UploadSignatureRequest(UploadOwnerType OwnerType)`, a response carrying intent ID plus Cloudinary upload parameters, and `CloudinaryUploadResultRequest` carrying `UploadIntentId`, `PublicId`, `Version`, `Signature`, `AssetId`, `Format`, and `Bytes`. `Version` is request-only and must not be persisted.

`ConsumeAsync` must leave an intent pending when validation/signature checking fails and must participate in the caller's tracked EF transaction rather than independently committing the domain change.

- [ ] **Step 4: Implement `UploadsController` and wire DI**

Add `POST /api/uploads/signature`; authorize `ADMIN`, `INVENTORY_MANAGER`, and `CASHIER`; extract the JWT subject and IP into `AuditLogContext`; return Unauthorized when the subject is invalid. Register `UploadIntentService` scoped in `Program.cs`.

- [ ] **Step 5: Run focused tests and build**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter "FullyQualifiedName~UploadIntentServiceTests|FullyQualifiedName~CloudinaryServiceTests" && dotnet build backend.sln`

Expected: PASS; the API and service compile without a `/complete` endpoint.

- [ ] **Step 6: Commit the upload-intent vertical slice**

```bash
git add app/backend/src/Dto/UploadDto app/backend/src/Services/UploadIntentService.cs app/backend/src/Controllers/UploadsController.cs app/backend/Program.cs app/backend.Tests/Services/UploadIntentServiceTests.cs
git commit -m "feat: add signed upload intents"
```

### Task 4: Integrate public images with BookSeries and Title

**Files:**

- Modify: `app/backend/src/Dto/BookSeriesDto/CreateBookSeriesRequest.cs`
- Modify: `app/backend/src/Dto/BookSeriesDto/UpdateBookSeriesRequest.cs`
- Modify: `app/backend/src/Dto/BookSeriesDto/BookSeriesResponse.cs`
- Modify: `app/backend/src/Dto/BookSeriesDto/BookSeriesDetailResponse.cs`
- Modify: `app/backend/src/Dto/TitleDto/CreateTitleRequest.cs`
- Modify: `app/backend/src/Dto/TitleDto/UpdateTitleRequest.cs`
- Modify: `app/backend/src/Dto/TitleDto/TitleResponse.cs`
- Modify: `app/backend/src/Dto/TitleDto/TitleDetailResponse.cs`
- Modify: `app/backend/src/Services/BookSeriesService.cs`
- Modify: `app/backend/src/Services/TitleService.cs`
- Modify: `app/backend/src/Controllers/BookSeriesController.cs`
- Modify: `app/backend/src/Controllers/BookTitlesController.cs`
- Create: `app/backend.Tests/Services/BookHierarchyImageServiceTests.cs`

**Interfaces:**

- Consumes: `UploadIntentService.ConsumeAsync`, `ICloudinaryService.BuildImageUrl`, `ICloudinaryService.DestroyAsync`, and `CloudinaryUploadResultRequest` from Tasks 2–3.
- Produces: optional `ImageUpload` request fields, nullable `ImageUrl` response fields, Create/Update consumption, and image replacement/removal operations for BookSeries and Title used by later client work.

**Acceptance Criteria:**

- Create/Update accepts a valid BookSeries/Title intent and saves only its verified public ID.
- Read list/detail DTOs return `ImageUrl` and never public IDs; query projections materialize IDs first and resolve URLs in memory.
- Replacing a direct image commits the new ID before destroying the old public Cloudinary asset; failure to destroy logs a warning without reverting DB state.
- Explicit image update/remove routes are available to all three staff roles without granting Cashier permission to edit unrelated book fields.

- [x] **Step 1: Write failing BookSeries/Title image tests**

Add `CreateBookSeries_consumes_verified_image_intent`, `GetTitles_returns_resolved_image_urls_without_public_ids`, and `ReplaceImage_keeps_new_reference_when_destroy_fails`. Use a fake Cloudinary service that records URL/destroy calls and a fake/real in-memory intent service setup.

- [x] **Step 2: Run the hierarchy tests to verify they fail**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~BookHierarchyImageServiceTests`

Expected: FAIL because DTOs/services have no image-intent integration.

- [x] **Step 3: Extend BookSeries and Title contracts/services**

Append nullable `CloudinaryUploadResultRequest? ImageUpload` to Create/Update requests. Add `ImageUrl` to list and detail responses. Change Create/Update service signatures to receive actor/audit context, consume a supplied intent using `BOOK_SERIES_IMAGE` or `TITLE_IMAGE`, write only the returned public ID, and add image audit entries.

Add `ImageUrl` to `BookSeriesTitleSummary` as well, so the nested Title representation does not omit the Title's own configured image.

Materialize page/detail rows containing `PublicImageId`, then call `BuildImageUrl` in memory; do not place SDK URL generation inside an EF LINQ projection.

- [x] **Step 4: Add domain-specific image operations and controller authorization**

Add `PUT /api/book-series/{id}/image`, `DELETE /api/book-series/{id}/image`, `PUT /api/book-titles/{id}/image`, and `DELETE /api/book-titles/{id}/image`. They consume/clear direct IDs and are authorized for all three staff roles; retain existing stricter roles for unrelated Create/Update fields.

- [x] **Step 5: Implement replacement/deletion post-commit behavior**

Capture an old direct ID, commit entity/intent/audit changes, then call `DestroyAsync` with the book owner type. Log (do not throw/revert) if Cloudinary deletion fails. Apply the same sequence when deleting a BookSeries or Title itself.

- [x] **Step 6: Run tests and build**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~BookHierarchyImageServiceTests && dotnet build backend.sln`

Expected: PASS; BookSeries/Title creation, read mapping, replacement, removal, and parent deletion meet the direct-image rules.

- [x] **Step 7: Commit BookSeries/Title image support**

```bash
git add app/backend/src/Dto/BookSeriesDto app/backend/src/Dto/TitleDto app/backend/src/Services/BookSeriesService.cs app/backend/src/Services/TitleService.cs app/backend/src/Controllers/BookSeriesController.cs app/backend/src/Controllers/BookTitlesController.cs app/backend.Tests/Services/BookHierarchyImageServiceTests.cs
git commit -m "feat: add book series and title images"
```

### Task 5: Integrate public images with Edition and BookCopy, and remove CoverImageUrl contracts

**Files:**

- Modify: `app/backend/src/Helpers/EditionValidator.cs`
- Modify: `app/backend/src/Dto/EditionDto/CreateEditionRequest.cs`
- Modify: `app/backend/src/Dto/EditionDto/UpdateEditionRequest.cs`
- Modify: `app/backend/src/Dto/EditionDto/EditionResponse.cs`
- Modify: `app/backend/src/Dto/EditionDto/EditionDetailResponse.cs`
- Modify: `app/backend/src/Dto/EditionDto/EditionMappingExtensions.cs`
- Modify: `app/backend/src/Dto/TitleDto/TitleDetailResponse.cs`
- Modify: `app/backend/src/Dto/BookCopyDto/CreateBookCopyRequest.cs`
- Modify: `app/backend/src/Dto/BookCopyDto/UpdateBookCopyRequest.cs`
- Modify: `app/backend/src/Dto/BookCopyDto/BookCopyResponse.cs`
- Modify: `app/backend/src/Dto/BookCopyDto/BookCopyDetailResponse.cs`
- Modify: `app/backend/src/Services/EditionService.cs`
- Modify: `app/backend/src/Services/BookCopyService.cs`
- Modify: `app/backend/src/Services/TitleService.cs`
- Modify: `app/backend/src/Controllers/EditionsController.cs`
- Modify: `app/backend/src/Controllers/BookCopiesController.cs`
- Create: `app/backend.Tests/Services/EditionAndCopyImageServiceTests.cs`

**Interfaces:**

- Consumes: all Task 2–3 Cloudinary/intent interfaces and direct image conventions established in Task 4.
- Produces: `ImageUrl` for Edition and BookCopy own images, `EditionImageUrl` where BookCopy detail explicitly represents the related Edition image, and image-specific routes for both entities.

**Acceptance Criteria:**

- No non-migration backend source references `CoverImageUrl`.
- Edition/BookCopy Create/Update consumes only the matching owner-type intent and returns public URLs.
- Title edition summaries expose an Edition `ImageUrl`; BookCopy detail distinguishes its own `ImageUrl` from related `EditionImageUrl` rather than exposing a misleading generic cover URL.
- Parent/image deletion follows database-first then Cloudinary behavior and uses the public policy.

- [x] **Step 1: Write failing Edition/BookCopy image tests**

Add `CreateEdition_consumes_edition_image_intent`, `GetBookCopyDetail_resolves_copy_and_edition_image_urls`, and `DeleteBookCopy_removes_public_asset_after_database_commit` using fixed IDs and a fake Cloudinary provider.

- [x] **Step 2: Run tests to verify they fail**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~EditionAndCopyImageServiceTests`

Expected: FAIL because Edition still accepts/returns CoverImageUrl and BookCopy lacks its own image contract.

- [x] **Step 3: Replace Edition CoverImageUrl throughout DTOs, validation, mappings, and projections**

Remove URL input from `EditionValidator`. Add optional image-upload result to Edition Create/Update request DTOs, consume `EDITION_IMAGE` intents in the service, and return `ImageUrl` derived after materialization. Rename `TitleEditionSummary.CoverImageUrl` to `ImageUrl`.

- [x] **Step 4: Add BookCopy image request/response/service behavior**

Append optional image-upload result to BookCopy Create/Update requests and consume `BOOK_COPY_IMAGE` intents. Add `ImageUrl` to BookCopy list/detail responses. In the detail response, rename the old related Edition field to `EditionImageUrl`, populate it from Edition's direct public ID, and keep copy image and edition image unambiguous.

- [x] **Step 5: Add image-specific controller routes and post-commit deletion behavior**

Add PUT/DELETE image routes under `/api/editions/{id}/image` and `/api/book-copies/{id}/image`, authorize all staff roles for those routes, and retain current roles for unrelated record mutation. On replacement/removal/parent deletion, commit database/audit state before the public Cloudinary destroy call and log destroy failures.

- [x] **Step 6: Run tests, ensure CoverImageUrl is eliminated, and build**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~EditionAndCopyImageServiceTests && ! rg -n --glob '!src/Data/Migrations/**' 'CoverImageUrl' app/backend/src && dotnet build backend.sln`

Expected: PASS; the search emits no matches and all image responses use resolved URLs.

- [x] **Step 7: Commit Edition/BookCopy image support**

```bash
git add app/backend/src/Helpers/EditionValidator.cs app/backend/src/Dto/EditionDto app/backend/src/Dto/TitleDto/TitleDetailResponse.cs app/backend/src/Dto/BookCopyDto app/backend/src/Services/EditionService.cs app/backend/src/Services/BookCopyService.cs app/backend/src/Services/TitleService.cs app/backend/src/Controllers/EditionsController.cs app/backend/src/Controllers/BookCopiesController.cs app/backend.Tests/Services/EditionAndCopyImageServiceTests.cs
git commit -m "feat: add edition and book copy images"
```

### Task 6: Retire Attachment and MinIO, and verify the complete backend

**Files:**

- Delete: `app/backend/src/Models/AttachmentModel.cs`
- Delete: `app/backend/src/Models/Enums/AttachmentOwnerType.cs`
- Delete: `app/backend/src/Services/AttachmentService.cs`
- Delete: `app/backend/src/Controllers/AttachmentController.cs`
- Delete: `app/backend/src/Dto/AttachmentDto/AttachmentDownloadUrlResponse.cs`
- Delete: `app/backend/src/Dto/AttachmentDto/AttachmentQuery.cs`
- Delete: `app/backend/src/Dto/AttachmentDto/AttachmentResponse.cs`
- Delete: `app/backend/src/Dto/AttachmentDto/DeleteAttachmentRequest.cs`
- Delete: `app/backend/src/Dto/AttachmentDto/UploadAttachmentRequest.cs`
- Delete: `app/backend/src/Configurations/MinioSettings.cs`
- Delete: `app/backend/src/Infrastructure/IMinioService.cs`
- Delete: `app/backend/src/Infrastructure/MinioService.cs`
- Delete: `app/backend/src/Infrastructure/MinioBucketInitializer.cs`
- Delete: `app/backend/src/Infrastructure/MinioReadinessHealthCheck.cs`
- Delete: `app/backend/src/Helpers/FileSignatureValidator.cs`
- Modify: `app/backend/src/Data/AppDbContext.cs`
- Modify: `app/backend/Program.cs`
- Modify: `app/backend/backend.csproj`
- Modify: `app/backend/appsettings.example.json`
- Modify: `app/backend/appsettings.Development.json`
- Modify: `docker-compose.yaml`
- Modify: `docs/DATABASE.txt`
- Create: `app/backend.Tests/Architecture/RemovedAttachmentAndMinioTests.cs`

**Interfaces:**

- Consumes: Cloudinary/UploadIntent/book image behavior from Tasks 1–5.
- Produces: A backend with no Attachment or MinIO runtime path; Task 1 already supplies the reviewed migration that creates the replacement schema and drops `attachments`.

**Acceptance Criteria:**

- The backend has no runtime MinIO/Attachment registrations, endpoints, package references, or health checks.
- The Task 1 migration adds direct image columns/new tables and drops `attachments`; historical migrations remain untouched.
- Docker Compose no longer starts or retains a MinIO service/volume.
- Full test/build/migration checks pass before a human chooses whether to apply the destructive database migration.

- [ ] **Step 1: Write failing architecture-removal tests**

In `RemovedAttachmentAndMinioTests.cs`, assert that the compiled AppDbContext model does not contain `AttachmentModel`, contains all replacement entity types, and has no Attachment DbSet/mapping. Provider registration is verified by the normal backend build and the final source search, without starting the production host or requiring real Cloudinary configuration.

- [ ] **Step 2: Run the architecture test to verify it fails**

Run: `dotnet test app/backend.Tests/backend.Tests.csproj --filter FullyQualifiedName~RemovedAttachmentAndMinioTests`

Expected: FAIL while Attachment and MinIO registrations still exist.

- [ ] **Step 3: Remove Attachment and MinIO runtime code/configuration**

Delete the exact files above; remove Attachment mapping/DbSet/indexes/relationships/enum conversion; remove MinIO health checks, options, DI, hosted initializer, package reference, appsettings sections, Docker service/volume, and all using directives. Preserve AuditLog itself and historical attachment audit rows.


- [ ] **Step 4: Reinspect the Task 1 migration and generate a deploy-review script**

Run:

```bash
dotnet ef migrations script --idempotent --project app/backend/backend.csproj --startup-project app/backend/backend.csproj
```

Verify the Task 1 migration adds `PublicImageId` columns, UploadIntent/RentalLineImage/StockReceiptImage tables plus expected indexes/FKs, and drops `attachments`. Do not run `dotnet ef database update` automatically because this is destructive.

- [ ] **Step 5: Update schema documentation and run complete verification**

Replace Attachment/MinIO schema documentation with UploadIntent, direct public-image fields, and deferred evidence tables in `docs/DATABASE.txt`.

Run:

```bash
dotnet test backend.sln
dotnet build backend.sln
! rg -n --glob '!src/Data/Migrations/**' '(AttachmentModel|AttachmentOwnerType|AttachmentService|Minio|IMinioService|FileSignatureValidator)' app/backend
git diff --check
```

Expected: all commands pass; the final search emits no runtime matches.

- [ ] **Step 6: Commit the replacement and destructive migration**

```bash
git add -A app/backend docker-compose.yaml docs/DATABASE.txt backend.sln
git commit -m "feat: replace attachments and MinIO with Cloudinary uploads"
```

### Task 7: Audit the completed backend upload logic

**Files:**

- Create: `docs/audits/2026-11-03-cloudinary-backend-audit.md`
- Inspect: all backend controllers, services, DTOs, `AppDbContext`, migrations, configuration, and Docker/runtime files changed by Tasks 1–6

**Interfaces:**

- Consumes: the completed Cloudinary, UploadIntent, book-image, evidence-schema, and cleanup behavior from Tasks 1–6.
- Produces: an evidence-backed audit report ranked as blocker/high/medium, with exact file/line references and one regression test recommendation for every actionable defect. It does not silently change production behavior; remediation is a separately approved follow-up task.

**Acceptance Criteria:**

- Verify the actual FE flow end-to-end in code: authenticated signature request → backend-owned Cloudinary parameters → direct FE upload → response metadata submitted only during domain Create/Update → same-actor/single-use intent consumption in the domain transaction.
- Verify every owner type is classified exclusively in `CloudinaryService`, book assets are public, and evidence assets are authenticated with a signed URL policy.
- Verify every direct-image change is database-first before attempted Cloudinary deletion, delete failures are logged as structured cleanup work, and AuditLog does not retain old Attachment-specific semantics.
- Verify no runtime Attachment/MinIO route, registration, configuration, package, health check, or source reference remains; historical migrations are excluded from this scan.
- Verify deferred RentalLine/StockReceipt image tables have no prematurely exposed service/controller surface.

- [ ] **Step 1: Establish the audit evidence set**

Run full test/build and targeted source searches:

```bash
dotnet test backend.sln
dotnet build backend.sln
! rg -n --glob '!src/Data/Migrations/**' '(AttachmentModel|AttachmentOwnerType|AttachmentService|Minio|IMinioService|FileSignatureValidator|CoverImageUrl)' app/backend
rg -n 'UploadIntent|UploadOwnerType|DestroyAsync|BuildImageUrl|CREATE_UPLOAD_INTENT' app/backend/src
```

Record command output, the migration's `Up`/`Down`, and controller authorization attributes as audit evidence.

- [ ] **Step 2: Trace each critical data path across boundaries**

Review the signature endpoint, `UploadIntentService`, `CloudinaryService`, and each BookSeries/Title/Edition/BookCopy Create/Update/Delete/image operation. Trace actor ID, owner type, public ID, Cloudinary response signature, DB transaction, audit action, and old-asset destroy behavior; flag any client-controlled security field or out-of-transaction intent mutation.

- [ ] **Step 3: Inspect runtime cleanup and deferred-scope boundaries**

Verify DI/configuration/Docker no longer initialize MinIO and the old routes return no reachable endpoint. Verify RentalLineImage/StockReceiptImage remain only persistence mappings with no accidental controller/service exposure.

- [ ] **Step 4: Write and triage the audit report**

Create `docs/audits/2026-11-03-cloudinary-backend-audit.md` with scope, evidence, findings sorted by severity, affected paths, exploitation/operational impact, and the smallest recommended remediation plus test. If no defects are found, explicitly document the checks performed and remaining deferred risks (cleanup worker and evidence APIs).

- [ ] **Step 5: Commit the audit artifact**

```bash
git add docs/audits/2026-11-03-cloudinary-backend-audit.md
git commit -m "docs: audit Cloudinary upload backend"
```

## Plan self-review

- **Spec coverage:** Tasks 1–7 cover direct image fields, UploadIntent constraints, Cloudinary signing/verification, public URL reads, deferred evidence schema, all three image-management roles, database-first deletion, audit integration, MinIO/Attachment removal, destructive migration, the intentionally deferred cleanup worker, and a final backend-logic audit.
- **Dependencies:** Task 1 defines the persisted contracts and checks in the destructive migration; Task 2 defines provider contracts; Task 3 produces consumable intent behavior; Tasks 4–5 consume it in independent book slices; Task 6 removes the old runtime only after replacements compile; Task 7 audits the whole completed flow before remediation is scheduled.
- **Type consistency:** `UploadOwnerType`, `CloudinaryUploadResultRequest`, `ICloudinaryService`, `UploadIntentService.ConsumeAsync`, `PublicImageId`, and `ImageUrl` keep the same names throughout the plan. `Version` is request-only everywhere.
- **Review focus coverage:** Each of the five listed risk cases is assigned a named test in Tasks 3–5.
- **Proportion:** The plan gives signatures, file scopes, contracts, and commands without prescribing method bodies or vendor SDK call details that an idiomatic .NET implementation can choose safely.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-03-cloudinary-direct-upload.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven** — A fresh implementer/reviewer per task; recommended because tasks share security-sensitive contracts and the destructive migration/provider boundary benefits from independent review.
- **Native** — I implement each task in this session and request one whole-branch review at the end; faster and less costly, but errors in shared upload contracts can survive longer.

Does the plan capture what you want, and which approach should we use?
