import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = (...parts) => readFileSync(path.join(frontendRoot, 'src', ...parts), 'utf8')

test('catalog cover uploads use the backend-signed Cloudinary flow', () => {
  const uploadServicePath = path.join(frontendRoot, 'src', 'features', 'uploads', 'upload.service.ts')
  assert.ok(existsSync(uploadServicePath), 'missing shared signed-upload service')

  const uploadService = readFileSync(uploadServicePath, 'utf8')
  const catalogService = source('features', 'catalog', 'catalog.service.ts')
  const titleEditor = source('features', 'catalog', 'components', 'TitleEditorDialog.tsx')

  assert.match(uploadService, /privateClient\.post<UploadSignatureResponse>\(UPLOAD_SIGNATURE_ENDPOINT, \{ ownerType \}\)/)
  assert.match(uploadService, /form\.append\('signature', signature\.signature\)/)
  assert.match(uploadService, /fetch\(signature\.uploadUrl, \{ method: 'POST', body: form \}\)/)
  assert.match(catalogService, /uploadImage\('TITLE_IMAGE', file\)/)
  assert.doesNotMatch(catalogService, /VITE_CLOUDINARY_/)
  assert.match(titleEditor, /imageUpload: imageUpload \?\? null/)
})
