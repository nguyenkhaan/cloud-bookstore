# Cloudinary Direct Upload Design

**Date:** 2026-11-03
**Status:** Proposed for approval
**Scope:** Backend storage migration from MinIO/Attachment to Cloudinary direct uploads

## Intent

Replace the generic `AttachmentModel` and the MinIO-backed multipart upload flow with direct frontend uploads to Cloudinary. The backend remains the authority that decides where and how an image may be uploaded, verifies the Cloudinary result, and attaches the resulting `public_id` to the correct domain entity.

The design deliberately avoids a replacement generic media/attachment table. Single-image book entities store their Cloudinary public ID directly. Rental damage evidence and stock receipt evidence use dedicated child tables because they support multiple images.

## Goals

- Remove `AttachmentModel`, its DTOs/controller/service, its database table, and every MinIO dependency.
- Let the frontend upload image bytes directly to Cloudinary using a signature issued by the authenticated backend.
- Keep the Cloudinary API secret exclusively on the backend.
- Store one public image directly on every entity in the book hierarchy:
  `BookSeriesModel`, `TitleModel`, `EditionModel`, and `BookCopyModel`.
- Prepare database support for an unlimited number of private evidence images for `RentalLineModel` and `StockReceiptModel` through two domain-specific child tables.
- Prevent the frontend from attaching an arbitrary Cloudinary asset by using a single-use `UploadIntentModel`.
- Return ready-to-render `ImageUrl` values to the frontend instead of exposing stored public IDs in read DTOs.
- Preserve auditability of signature issuance, image attachment/replacement, and deletion.

## Non-goals

- Migrating existing Attachment metadata or MinIO objects. The current environment permits complete deletion.
- A generic replacement `MediaAsset` or polymorphic Attachment table.
- An automatic worker for abandoned upload cleanup in this phase.
- Enforcing an expiration time on UploadIntent consumption.
- Limiting the number of RentalLine or StockReceipt images in this phase.
- Time-limited Cloudinary delivery URLs in this phase.
- Supporting PDF or non-image uploads.
- RentalLine/StockReceipt image APIs and services. This phase creates only their models, tables, constraints, and access-policy mapping.

## Accepted limitation

Private evidence uses Cloudinary's `authenticated` delivery type and backend-generated signed delivery URLs. In the first version those signed URLs do not expire. Access to the URL is gated by the backend, but a user who receives a URL can share and reuse it. Time-limited token delivery or `private_download_url` may be introduced later if this limitation becomes unacceptable.

## Approaches considered

### Chosen: shared Cloudinary and UploadIntent services

- `CloudinaryService` owns Cloudinary-specific policy and operations.
- `UploadIntentService` owns intent creation and consumption.
- Domain services call `UploadIntentService` from their Create/Update operations.

This centralizes the security-sensitive signature and verification logic without reintroducing a generic media persistence model.

### Rejected: each domain service handles intents directly

This initially uses fewer classes, but repeats signature verification, ownership checks, and single-use enforcement across six domain areas. The risk of one service applying weaker validation outweighs the small reduction in structure.

### Rejected: generic replacement Attachment/MediaAsset table

It would preserve polymorphic querying and joins that this change explicitly intends to remove. It would also duplicate the direct `PublicImageId` fields required for fast domain queries.

## Domain image policy

Introduce an enum such as `UploadOwnerType` with these values:

| Owner type | Persistence destination | Cloudinary delivery type | Cardinality |
|---|---|---|---|
| `BOOK_SERIES_IMAGE` | `BookSeriesModel.PublicImageId` | `upload` | One |
| `TITLE_IMAGE` | `TitleModel.PublicImageId` | `upload` | One |
| `EDITION_IMAGE` | `EditionModel.PublicImageId` | `upload` | One |
| `BOOK_COPY_IMAGE` | `BookCopyModel.PublicImageId` | `upload` | One |
| `RENTAL_LINE_IMAGE` | `RentalLineImageModel` | `authenticated` | Unlimited |
| `STOCK_RECEIPT_IMAGE` | `StockReceiptImageModel` | `authenticated` | Unlimited |

`CloudinaryService` must contain one exhaustive policy function that maps `UploadOwnerType` to the Cloudinary delivery type. The frontend cannot select or override the delivery type.

All implemented image operations may be managed by `ADMIN`, `INVENTORY_MANAGER`, and `CASHIER`. The backend still validates that the referenced owner exists and that the intent belongs to the current actor.

The policy function includes `RENTAL_LINE_IMAGE` and `STOCK_RECEIPT_IMAGE` now so their eventual delivery type is unambiguous. However, the signature endpoint rejects those two owner types as unsupported in this phase because no domain API exists to consume their intents. Enabling signature issuance without a consuming operation would create permanently unusable pending intents and Cloudinary orphans.

## Data model

### Direct fields

Add a nullable `string PublicImageId` to:

- `BookSeriesModel`
- `TitleModel`
- `EditionModel`
- `BookCopyModel`

Rename `EditionModel.CoverImageUrl` to `PublicImageId`. No existing value needs to be preserved. Use a consistent maximum length suitable for Cloudinary public IDs.

### RentalLineImageModel

| Field | Type | Rules |
|---|---|---|
| `Id` | `Guid` | Primary key |
| `RentalLineId` | `Guid` | Required FK to `RentalLineModel` |
| `PublicImageId` | `string` | Required, unique within the table |
| `CreatedAt` | `DateTime` | Required, UTC/default `now()` |

The relationship uses `NoAction/Restrict` deletion so parent deletion cannot silently cascade and leave a Cloudinary asset orphaned. The domain service must explicitly remove image rows and schedule/call Cloudinary deletion.

### StockReceiptImageModel

| Field | Type | Rules |
|---|---|---|
| `Id` | `Guid` | Primary key |
| `StockReceiptId` | `Guid` | Required FK to `StockReceiptModel` |
| `PublicImageId` | `string` | Required, unique within the table |
| `CreatedAt` | `DateTime` | Required, UTC/default `now()` |

It follows the same deletion behavior as `RentalLineImageModel`.

### UploadIntentModel

`UploadIntentModel` is an authorization ticket and durable upload audit record. It is not queried as the source of domain images and has no FK from any image-bearing entity.

| Field | Type | Rules |
|---|---|---|
| `Id` | `Guid` | Primary key |
| `OwnerType` | `UploadOwnerType` | Required, stored as string |
| `PublicImageId` | `string` | Required, unique, generated by backend |
| `Status` | `UploadIntentStatus` | `PENDING` or `COMPLETED`, stored as string |
| `CreatedBy` | `Guid` | Required FK to Employee |
| `CreatedAt` | `DateTime` | Required, UTC/default `now()` |
| `CompletedAt` | `DateTime?` | Set when consumed |
| `AssetId` | `string?` | Cloudinary response metadata |
| `Format` | `string?` | Cloudinary response metadata |
| `Bytes` | `long?` | Cloudinary response metadata |

Completed intents are retained indefinitely. Pending abandoned intents are also retained in this phase; a future cleanup worker may identify and remove abandoned Cloudinary assets. There is no `ExpiresAt` and age is not used to reject consumption. `CreatedAt` remains for audit and future cleanup.

Only `public_id` and `version` are covered by Cloudinary's upload response signature. Other response metadata is informational and must not be used for authorization. Upload format and size security is enforced by the signed upload preset, not by trusting metadata sent by the frontend.

## Public ID generation

The backend generates every public ID. A stable scheme is:

```text
<RootFolder>/<visibility>/<owner-type-segment>/<upload-intent-id>
```

For example:

```text
cloud-bookstore/public/editions/7d13d8f578b145a298c2f54c613dbf57
cloud-bookstore/private/rental-lines/16dba65bf81d4372ab8800896325ba6f
```

Using the intent ID avoids requiring a domain owner ID before a Create request and makes collisions impractical. The frontend cannot provide or alter the public ID.

For Cloudinary product environments using dynamic folders, the backend also signs `asset_folder` as `<RootFolder>/<visibility>/<owner-type-segment>` so the asset appears in that Media Library folder. `public_id` paths alone do not choose a dynamic-folder location. For legacy fixed-folder environments, configure `FolderMode: FIXED`; the path embedded in `public_id` creates the folder hierarchy and no `asset_folder` is sent.

## API design

### POST /api/uploads/signature

Requires authentication and one of the three staff roles.

Request:

```json
{
  "ownerType": "EDITION_IMAGE"
}
```

- The intent records the requested owner type, actor, and backend-generated public ID; it does not record an owner ID or distinguish Create from Update.
- The Create/Update operation supplies the actual domain entity and must enforce its own domain authorization before consuming the intent.
- `RENTAL_LINE_IMAGE` and `STOCK_RECEIPT_IMAGE` are rejected by this endpoint until their domain APIs are implemented.

The backend creates the UploadIntent before returning the signature.

Response:

```json
{
  "uploadIntentId": "guid",
  "cloudName": "cloud-name",
  "apiKey": "public-api-key",
  "timestamp": 1793650000,
  "signature": "signature",
  "publicId": "cloud-bookstore/public/editions/intent-id",
  "assetFolder": "cloud-bookstore/public/editions",
  "resourceType": "image",
  "deliveryType": "upload",
  "uploadPreset": "configured-signed-preset"
}
```

Returning `publicId` here is required for the Cloudinary upload. It does not conflict with omitting public IDs from normal domain read DTOs.

There is no `/complete` endpoint.

### Create/Update request integration

Create and Update requests accept an optional nested upload result:

```json
{
  "imageUpload": {
    "uploadIntentId": "guid",
    "publicId": "edition/intent-id",
    "version": 1793650042,
    "signature": "cloudinary-response-signature",
    "assetId": "cloudinary-asset-id",
    "format": "webp",
    "bytes": 123456
  }
}
```

RentalLine and StockReceipt do not accept upload results in this phase. Their future domain APIs will consume one intent per image and create one child-table row per image.

The domain service creates/updates the entity and consumes all supplied intents in the same database transaction. A failed validation or rolled-back transaction leaves the intent `PENDING`, allowing the frontend to retry.

### Read responses

- BookSeries, Title, Edition, and BookCopy DTOs expose nullable `ImageUrl`, never `PublicImageId`.
- Future RentalLine and StockReceipt image items will expose `Id`, `ImageUrl`, and `CreatedAt`, never `PublicImageId`.
- `CloudinaryService` builds a normal secure public delivery URL for public book images.
- It builds a signed `authenticated` delivery URL for evidence images.
- The first version's authenticated signed URL does not expire.

### Image deletion

Single-image entities expose a domain-specific image removal operation or an equivalent explicit update command. Future multi-image APIs will delete by their child image row ID under the parent route.

Deletion order is intentionally database-first:

1. Authorize and load the row/entity and old public ID.
2. Clear the direct field or remove the child image row.
3. Commit the database change and audit log.
4. Call Cloudinary Destroy using the server-derived delivery type.
5. If Cloudinary deletion fails, log the failure for a future cleanup worker; do not restore the database reference.

For public assets, request CDN invalidation when destroying. Image deletion is considered successful from the domain perspective once the database no longer exposes it.

Deleting a BookSeries, Title, Edition, or BookCopy must capture its direct `PublicImageId`, commit the domain deletion first, then destroy the Cloudinary asset using the same database-first ordering. Parent deletion for RentalLine and StockReceipt remains blocked by `NoAction/Restrict` while child rows exist; their future domain services must explicitly remove those rows before deleting the parent.

## Service responsibilities

### CloudinaryService

The service wraps the supported Cloudinary .NET SDK and is the only code that knows the API secret.

Responsibilities:

- Exhaustively map `UploadOwnerType` to `upload` or `authenticated`.
- Select the corresponding signed upload preset.
- Generate backend-owned public IDs and the corresponding Cloudinary folder.
- Generate upload request signatures from an exact server-owned parameter set.
- Verify the upload response signature using `public_id` and `version`.
- Build secure public delivery URLs.
- Build signed authenticated delivery URLs.
- Destroy public/authenticated assets and invalidate public CDN copies.

It must not accept an arbitrary dictionary of frontend-provided parameters to sign.

### UploadIntentService

Responsibilities:

- Validate role and requested owner type.
- Create the pending UploadIntent and request a signature from CloudinaryService.
- Load intents for consumption with tracking.
- Require `PENDING` status and the same `CreatedBy` actor.
- Require an exact match for owner type and public ID.
- Ask CloudinaryService to verify the response signature.
- Copy informational response metadata into the intent.
- Set `Status = COMPLETED` and `CompletedAt`.
- Reject reuse of completed intents.

The domain service remains responsible for writing the public ID to its direct field or child table. This keeps domain persistence explicit while centralizing verification.

## Replacement behavior for single images

Do not overwrite an existing Cloudinary asset under the same public ID.

1. Upload a new asset with a new intent/public ID.
2. Verify and consume the intent in the entity Update transaction.
3. Replace the entity's `PublicImageId` and commit.
4. Delete the old Cloudinary asset after commit.
5. If old-asset deletion fails, keep the new database value and record the orphan for future cleanup.

This avoids losing the current image when upload or database work fails and avoids stale CDN content from an overwrite.

The first version accepts last-write-wins behavior for simultaneous replacements. A losing replacement may leave a completed intent whose public ID is no longer referenced. This is an accepted temporary storage leak, not a domain-data inconsistency, and is handled by the future orphan cleanup design rather than by adding concurrency tokens in this phase.

## Upload validation and Cloudinary configuration

- Only JPEG, PNG, and WebP images are allowed.
- Maximum file size is 10 MB.
- PDF is no longer supported.
- Configure signed Cloudinary upload presets for public and authenticated images with the same format and size restrictions.
- The backend signs and returns only the selected preset and server-owned parameters, including `asset_folder` in dynamic-folder mode.
- Frontend validation is for user experience only and is not a security boundary.

Add validated backend settings for at least:

- `CloudName`
- `ApiKey`
- `ApiSecret`
- `RootFolder`
- `FolderMode` (`DYNAMIC` by default; `FIXED` only for a legacy fixed-folder environment)
- Public signed upload preset name
- Authenticated signed upload preset name

The API secret belongs in environment/user-secret/production secret storage and not committed application JSON.

## Audit behavior

Replace Attachment audit actions with:

- `CREATE_UPLOAD_INTENT` on signature issuance, targeting `UploadIntentModel`.
- `ATTACH_IMAGE` when a pending intent is consumed without replacing an image.
- `REPLACE_IMAGE` when a direct image changes.
- `DELETE_IMAGE` when an image reference is removed.

The consume audit targets the domain entity or child image row, includes the intent ID and public ID in structured before/after data, and uses the authenticated actor/IP context. Existing historical `UPLOAD_ATTACHMENT` and `DELETE_ATTACHMENT` rows remain untouched.

## Failure behavior

| Failure | Required result |
|---|---|
| Signature creation fails | Do not return a usable intent/signature; retain or roll back the new intent consistently |
| Frontend upload fails | Intent remains `PENDING` |
| Create/Update validation fails | Intent remains `PENDING` |
| Response signature is invalid | Reject request; intent remains `PENDING` |
| Actor, owner type, or public ID mismatch | Reject request; intent remains `PENDING` |
| Intent already completed | Reject as conflict |
| Database transaction fails | Entity, child image row, audit, and intent consumption all roll back |
| New image committed but old Cloudinary deletion fails | Keep new DB state; log orphan for later cleanup |
| Explicit image deletion commits but Cloudinary deletion fails | Keep image absent from DB; log orphan for later cleanup |

Deletion failures are recorded as structured application warnings in this phase. The retained completed UploadIntents provide the durable inventory needed by a future worker: it can compare completed intent public IDs with all direct image fields and child-image tables, then treat unreferenced assets as cleanup candidates. No deletion outbox table is added now.

## Existing code removal and replacement

Remove:

- `AttachmentModel` and `AttachmentOwnerType`
- `AttachmentService`, `AttachmentController`, and all Attachment DTOs
- Attachment DbSet, EF mapping, relationships, indexes, and enum conversion
- `IMinioService`, `MinioService`, `MinioBucketInitializer`, and `MinioReadinessHealthCheck`
- `MinioSettings` and `FileSignatureValidator`
- MinIO DI/options/health-check registrations
- MinIO NuGet package and appsettings sections
- MinIO Docker Compose service and volume after database deployment is verified

Replace:

- `EditionModel.CoverImageUrl` with `PublicImageId`
- Every Edition request, response, validator, mapping, and projection that currently carries `CoverImageUrl`
- Title and BookCopy projections that currently surface Edition's cover URL; each model now exposes its own image URL
- The current frontend attachment API contract with signature and domain Create/Update contracts

Add:

- Cloudinary .NET SDK dependency
- `CloudinarySettings`, `CloudinaryService`, and `UploadIntentService`
- Upload signature controller/DTOs
- UploadIntent enums/model/mapping
- Direct `PublicImageId` fields
- RentalLine and StockReceipt image models/mappings

## Database migration and rollout

No existing Attachment or MinIO data is preserved.

The schema migration should:

1. Add `PublicImageId` to BookSeries, Title, and BookCopy.
2. Replace/drop Edition `CoverImageUrl` and add/rename to `PublicImageId` without data migration.
3. Create UploadIntent, RentalLineImage, and StockReceiptImage tables and indexes.
4. Drop the `attachments` table.
5. Update the EF model snapshot through normal migration generation.

Do not edit or delete historical applied migrations such as `AddAttachments`.

Application rollout order:

1. Configure Cloudinary product environment, credentials, and signed upload presets.
2. Deploy database and backend changes together.
3. Deploy the frontend direct-upload flow and new Create/Update payloads.
4. Verify Cloudinary upload, public display, private signed display, replacement, and deletion.
5. Remove the MinIO container and volume only after verification.

Because the environment allows destructive replacement, no compatibility period or dual-write path is required.

## Verification expectations

Implementation verification should cover at minimum:

- Exhaustive owner-to-delivery-type classification.
- Signature endpoint authentication and role checks.
- Backend-owned public ID and signed parameter whitelist.
- Intent ownership, owner type, public ID, response signature, and single-use checks.
- Transactional Create/Update behavior and retry after rollback.
- Public URL generation for all four book entities.
- Correct authenticated delivery-type classification for both evidence owner types; evidence URL/API verification is deferred with their services.
- Direct-field replacement and post-commit deletion behavior.
- EF models, relationships, and migrations for both unlimited child-image tables.
- Removal of all MinIO/Attachment runtime registrations and references.
- Successful EF migration generation and backend build.

## Builder decisions that do not change product behavior

The implementer may choose exact DTO/class names, route nesting for domain-specific image deletion, maximum string lengths, and internal helper method signatures as long as the contracts and invariants above are preserved. No additional generic media abstraction should be introduced.
