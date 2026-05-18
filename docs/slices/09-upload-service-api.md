# Slice 09 — API: UploadService (Cloudinary + pdf-parse + Validation)

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 01](./01-prisma-migration-seed.md)
> **Branch:** `ihm/feat/upload-service-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

`apps/api/src/modules/upload/upload.service.ts` and `upload.controller.ts` are empty stubs. The config file `apps/api/src/config/cloudinary.config.ts` exists. The `UploadService` is the entry point for every print file: it validates the MIME type and size, stores the file in Cloudinary `printslot/pending/`, and (for PDFs) auto-detects the page count via `pdf-parse`.

[Slice 13](./13-order-creation-api.md) consumes the upload result. After Order creation, the API moves Cloudinary files from `pending/` to `orders/{orderId}/` — that move is part of Slice 13, not this slice.

## 2. Goal

A single working `POST /upload` endpoint accepting multipart files, validating MIME and size, storing in Cloudinary, returning a typed `UploadedFile` shape with optional `detectedPages` for PDFs.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/api/src/modules/upload/upload.service.ts`
- `apps/api/src/modules/upload/upload.controller.ts`
- `apps/api/src/modules/upload/upload.module.ts` — register Multer interceptor or wire the file middleware
- `apps/api/src/config/cloudinary.config.ts` — verify `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` are wired
- `apps/api/package.json` — add `cloudinary`, `pdf-parse`, `@types/pdf-parse`, `multer`, `@types/multer` if missing

### Create
- `apps/api/src/modules/upload/__tests__/upload.service.spec.ts`
- `apps/api/src/modules/upload/__tests__/upload.controller.spec.ts`
- `packages/shared/src/types/upload.types.ts` — define `UploadedFile` shape; re-export from `index.ts`

### Read first
- [`docs/05-api-contract.md`](../05-api-contract.md) §Upload
- [`apps/api/src/config/cloudinary.config.ts`](../../apps/api/src/config/cloudinary.config.ts)
- [`CONTEXT.md`](../../CONTEXT.md) §"Cloudinary folders"

## 4. Implementation Rules

### Endpoint
- `POST /upload` — `CUSTOMER` role required (JwtAuthGuard + RolesGuard). `multipart/form-data` with field name `file`.
- Response: `UploadedFile` = `{ fileUrl, fileName, mimeType, fileSize, detectedPages: number | null }`.

### Accepted MIME types (constant)
```ts
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'image/jpeg',
  'image/png',
];
```

### Validation
- **Size:** 20 MB max. Configure Multer limit; on exceed, Multer throws `LIMIT_FILE_SIZE` → map to 413.
- **MIME:** if not in `ACCEPTED_MIME` → 415.
- **Empty filename or missing file field** → 400.

### Cloudinary upload
- Use `cloudinary.uploader.upload_stream({ folder: 'printslot/pending/', resource_type: 'raw' | 'image' })`.
- `resource_type`: `'image'` for `image/*`; `'raw'` otherwise.
- Pass the file Buffer via `.end(file.buffer)`.
- Wrap in a `Promise` to await.
- Return `secure_url` as `fileUrl`.

### pdf-parse
- Only call for `mimeType === 'application/pdf'`.
- Wrap in try/catch — on error, return `detectedPages: null`. Do not rethrow.
- Read pages from `result.numpages`.

### Non-PDF
- Return `detectedPages: null` always.

### Shared type
```ts
// packages/shared/src/types/upload.types.ts
export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  detectedPages: number | null;
}
```

## 5. Edge Cases

- **20 MB exactly:** allowed.
- **20 MB + 1 byte:** Multer rejects → 413.
- **Empty file (0 bytes):** Multer/Cloudinary may accept; we should reject at 400 with "Empty file."
- **Corrupted PDF:** pdf-parse throws → return `detectedPages: null`. No error to client.
- **PDF with 0 pages (unusual):** pdf-parse returns 0 → return 0. Order creation handles 0-page issue (range validation).
- **Cloudinary error (network, auth):** propagate as 500. Log details server-side.
- **Image > 20 MB:** still rejected at Multer layer.
- **MIME mismatch with extension** (e.g. `.pdf` file but server reports `image/jpeg`): trust the detected MIME, not the extension. Reject if not in list.
- **Multiple files in one request:** spec is one file per call — reject extra fields or use single-file Multer config.

## 6. Test Cases

### Service spec (mocked Cloudinary)
1. PDF upload returns correct `detectedPages` from pdf-parse mock.
2. PNG upload returns `detectedPages: null`.
3. pdf-parse error returns `detectedPages: null` (does not throw).
4. Cloudinary upload uses `printslot/pending/` folder.
5. Cloudinary upload uses `resource_type: 'image'` for image MIMEs.

### Controller spec
6. Upload without JWT → 401.
7. Upload with `STAFF` role → 403 (only `CUSTOMER`).
8. Upload with unsupported MIME → 415.
9. Upload over 20 MB → 413 (Multer-handled).
10. Response shape matches `UploadedFile`.

## 7. Definition of Done

- [ ] `POST /upload` accepts `multipart/form-data` with field `file`
- [ ] Only `CUSTOMER` role permitted
- [ ] Validates MIME (415) and size (413)
- [ ] Stores in Cloudinary `printslot/pending/` folder
- [ ] PDF: `detectedPages` returned; pdf-parse failure → null (not 500)
- [ ] Non-PDF: `detectedPages: null`
- [ ] `UploadedFile` shared type added and re-exported
- [ ] All required packages installed and in `package.json`
- [ ] Service + controller specs pass
- [ ] `npm test -- --testPathPattern=upload` passes
- [ ] Branch `ihm/feat/upload-service-api`; PR title `[Slice 09]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`docs/05-api-contract.md`](../05-api-contract.md) §Upload
   - [`CONTEXT.md`](../../CONTEXT.md) §"Cloudinary folders"
   - The empty stubs in `apps/api/src/modules/upload/`
2. **Install missing packages:**
   - `cloudinary` (v2.x)
   - `pdf-parse`
   - `@types/pdf-parse` (devDependency)
   - `multer`, `@types/multer` (devDependency)
3. **Add `UploadedFile` to shared package** first.
4. **Wire Multer interceptor** in controller using `@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))` from `@nestjs/platform-express`.
5. **Write service spec first** (TDD).
6. **Implement service.** Build pure helpers — `isMimeAccepted`, `getResourceType` — for easy testing.
7. **Implement controller** — thin wrapper that returns `UploadedFile`.
8. **Manual smoke test:** use curl or Postman with a PDF and a PNG to confirm both paths work.

### Gotchas

- Configure Multer limits inside the `FileInterceptor` config, not globally.
- Use Cloudinary's stream API (`upload_stream`) for buffer uploads, not the URL-based `upload` API.
- `pdf-parse` reads from a Buffer; pass `file.buffer` directly.
- Wrap the Cloudinary stream upload in a `Promise<UploadApiResponse>` resolved in the stream's callback — avoid callback hell.
- Do not store the file locally — keep it in memory (Multer's default `memoryStorage` is correct).

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §`POST /upload`
- [`CONTEXT.md`](../../CONTEXT.md) §"Cloudinary folders"
- [Cloudinary Node docs](https://cloudinary.com/documentation/node_integration)
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse)
