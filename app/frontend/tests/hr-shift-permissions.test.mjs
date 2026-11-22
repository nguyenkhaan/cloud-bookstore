import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let server
let ShiftRecordDrawer

before(async () => {
  server = await createServer({ appType: 'custom', server: { hmr: false, middlewareMode: true } })
  ;({ ShiftRecordDrawer } = await server.ssrLoadModule('/src/features/hr/components/ShiftRecordDrawer.tsx'))
})

after(async () => { await server?.close() })

function renderDrawer(readOnly) {
  return renderToStaticMarkup(React.createElement(ShiftRecordDrawer, {
    open: true,
    readOnly,
    record: { id: 'shift-1', workDate: '18/10/2026', employeeId: 'NV-0002', shiftOrder: 'Ca sáng', note: 'Existing note', state: 'assigned' },
    onClose() {},
    onSave() { assert.fail('Viewing a shift must not save it') },
  }))
}

test('view-only shift drawer disables all editable fields and offers no save action', () => {
  const html = renderDrawer(true)
  const fields = html.match(/<(?:button[^>]*aria-haspopup="listbox"|input|textarea)[^>]*>/g) ?? []
  assert.equal(fields.length, 4)
  for (const field of fields) {
    assert.match(field, /disabled=""/)
  }
  assert.doesNotMatch(html, /Lưu bản ghi ca/)
  assert.match(html, /Existing note/)
  assert.match(html, /Chi tiết bản ghi ca/)
})

test('admin shift drawer remains editable with a save action', () => {
  const html = renderDrawer(false)
  assert.match(html, /Lưu bản ghi ca/)
  assert.doesNotMatch(html, /disabled=""/)
})

test('shift page passes non-admin permission into the drawer and guards saving', () => {
  const source = readFileSync(new URL('../src/features/hr/pages/ShiftRecordsPage.tsx', import.meta.url), 'utf8')
  assert.match(source, /readOnly=\{!isAdminView\}/)
  assert.match(source, /onSave=\{\(record\) => \{\s*if \(!isAdminView\) return/)
})
