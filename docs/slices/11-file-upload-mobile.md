# Slice 11 — Mobile: File Picker + Upload Service + FilePickerCard

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 09](./09-upload-service-api.md), [Slice 10](./10-print-config-form-mobile.md)
> **Branch:** `ihm/feat/file-upload-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

Customers pick files from device storage, upload them, then configure each via `PrintConfigForm`. The picked file's metadata + PrintConfig become an `OrderFile`. This slice owns the picker UI and the upload logic. The wizard ([Slice 14](./14-order-creation-wizard-mobile.md)) wires this into step 2.

`apps/mobile/src/features/upload/services/uploadService.ts` and `hooks/useFileUpload.ts` are empty stubs. `PrintConfigForm` is implemented by [Slice 10](./10-print-config-form-mobile.md).

## 2. Goal

A reusable `<FilePickerSection files={...} onAdd={...} onChange={...} onRemove={...} maxFiles={10} />` that lets the customer pick files via `expo-document-picker` or `expo-image-picker`, uploads them, shows progress, and renders a list of `FilePickerCard` rows with embedded `PrintConfigForm` per file. Max 10 files enforced.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/mobile/src/features/upload/services/uploadService.ts`
- `apps/mobile/src/features/upload/hooks/useFileUpload.ts`

### Create
- `apps/mobile/src/features/upload/components/FilePickerSection.tsx`
- `apps/mobile/src/features/upload/components/FilePickerCard.tsx`
- `apps/mobile/src/features/upload/__tests__/uploadService.test.ts`
- `apps/mobile/src/features/upload/__tests__/FilePickerCard.test.tsx`

### Modify package.json
- `apps/mobile/package.json` — add `expo-document-picker`, `expo-image-picker` if missing

### Read first
- [Slice 09](./09-upload-service-api.md) — response shape
- [Slice 10](./10-print-config-form-mobile.md) — PrintConfigForm contract
- [`AGENTS.md`](../../AGENTS.md) — file picker, FlashList rules
- `apps/mobile/src/services/api.ts` — `apiFetch` and the multipart pattern

## 4. Implementation Rules

### Data model (mobile-local)

```tsx
type WizardFile = {
  localId: string;             // uuid generated on add
  upload: UploadedFile | null; // null while uploading
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error';
  uploadError?: string;
  manualPages: number | null;  // entered by user for non-PDF
  config: PrintConfig;
};
```

### Upload service
- `uploadFile(uri: string, name: string, mimeType: string): Promise<UploadedFile>` — wraps `fetch` with `FormData`. Uses `apiFetch` if it supports FormData; if not, create a parallel `apiFetchMultipart`.
- Auth: include `Authorization: Bearer <token>` from the same store.

### Hook
- `useUploadFile()` — returns `{ uploadFile: (file) => Promise<UploadedFile>, isUploading: boolean }`. Internally uses TanStack `useMutation`.

### Picker
- `pickDocument()` — uses `expo-document-picker` with allowed MIME types matching the server.
- `pickImage()` — uses `expo-image-picker` if user wants photos.
- UI: an "Add file" Pressable that opens an action sheet — "Pick document" / "Pick image" / "Cancel".

### FilePickerSection layout
- Top row: "Files (X / 10)" header + "Add file" button.
- List: stack of FilePickerCard.
- Empty state: "Add at least 1 file."

### FilePickerCard layout
- Thumbnail/icon (e.g. PDF icon, image preview).
- File name (truncated 1 line).
- File size formatted (KB/MB).
- Detected pages badge ("8 pages") or manual-pages input (numeric).
- Status indicator (uploading spinner, success check, error icon).
- "Configure" expand button — when expanded, shows `PrintConfigForm`.
- Remove button.

### Rules
- **Max 10 files** — disable "Add file" beyond 10.
- **Upload starts immediately** when a file is picked. Card shows uploading state.
- **Upload failure** is recoverable — show retry on the card.
- **Removing a file** does not call any server cleanup (Cloudinary `pending/` expires in 24 h).
- **Manual page count is required** for non-PDF before the form is considered valid.
- **Parent passes `files: WizardFile[]`** and updates via `onChange`.

## 5. Edge Cases

- **Cancelled picker dialog** — no error, no state change.
- **Picked file MIME not accepted client-side** — show error toast, do not upload.
- **Picked file >20 MB** — server returns 413, show error.
- **Network drop during upload** — mutation fails; card shows retry.
- **User taps "Add file" when at 10** — button disabled (don't show toast).
- **Same file picked twice** — allow; each gets a new `localId`.
- **`detectedPages` is null and `manualPages` is null** — form is invalid; submit blocked.
- **User configures, then changes mind and removes file** — discard local state cleanly.

## 6. Test Cases

### uploadService
1. `uploadFile(...)` sends multipart `POST /upload` with `file` field.
2. Returns the parsed `UploadedFile`.
3. Propagates server errors (415, 413).

### FilePickerCard
4. Renders file name and size.
5. Shows upload spinner while `uploadStatus = 'uploading'`.
6. Shows retry button when `uploadStatus = 'error'`.
7. Manual page input visible only for non-PDF.
8. "Configure" expand toggles PrintConfigForm visibility.
9. Remove button calls `onRemove(localId)`.

## 7. Definition of Done

- [ ] `uploadService` and `useUploadFile` implemented
- [ ] `FilePickerSection` and `FilePickerCard` components built
- [ ] Picker action sheet with document and image options
- [ ] Auto-upload on file pick
- [ ] Max 10 files enforced
- [ ] Retry on upload error
- [ ] PrintConfigForm embedded per file
- [ ] Tests pass
- [ ] Branch `ihm/feat/file-upload-mobile`; PR title `[Slice 11]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 09](./09-upload-service-api.md) and [Slice 10](./10-print-config-form-mobile.md)
   - `apps/mobile/src/services/api.ts`
2. **Install `expo-document-picker` and `expo-image-picker`.**
3. **Implement `uploadService.uploadFile()`** with FormData. Use `fetch` directly with the `Authorization` header read from the token getter.
4. **Implement `useUploadFile`** as a `useMutation`.
5. **Build `FilePickerCard`** — start with static layout, then status states.
6. **Build `FilePickerSection`** — wires picker + card list.
7. **Test manually:** pick a real PDF + a real PNG on the simulator/device.

### Gotchas

- React Native `FormData`: the second arg of `.append` is `{ uri, name, type }` — not a `File` object.
- `expo-document-picker` returns `{ assets: [{ uri, name, mimeType, size }] }` on success.
- iOS may require `app.json` Info.plist photo library permission; expo-image-picker handles request automatically.
- Do not auto-upload more than 3 files in parallel; throttle via mutex or sequential `await`.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §`POST /upload`
- [Expo document picker](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [Expo image picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [`AGENTS.md`](../../AGENTS.md) §FlashList, §Modals
