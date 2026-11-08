import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = (...parts) => readFileSync(path.join(frontendRoot, 'src', ...parts), 'utf8')

test('title rows provide a confirmed delete action', () => {
  const page = source('features', 'catalog', 'pages', 'TitleListPage.tsx')
  const actionPath = path.join(frontendRoot, 'src', 'features', 'catalog', 'components', 'TitleRowDeleteAction.tsx')

  assert.ok(existsSync(actionPath), 'TitleRowDeleteAction should exist for each title row')
  const action = readFileSync(actionPath, 'utf8')

  assert.match(page, /import \{ TitleRowDeleteAction \} from '\.\.\/components\/TitleRowDeleteAction'/)
  assert.match(page, /<TitleRowDeleteAction title=\{title\} \/>/)
  assert.match(page, /<article className="(?:group )?flex gap-4 p-4 transition hover:bg-slate-50\/70"/)
  assert.match(page, /<TitleRowDeleteAction title=\{title\} \/>\s*<ActiveBadge active=\{title\.isActive\} \/>/)
  assert.match(action, /import \{ Trash2 \} from 'lucide-react'/)
  assert.match(action, /import \{ Button, ConfirmationDialog \} from '@\/components\/common'/)
  assert.match(action, /aria-label=\{`Xóa \$\{title\.name\}`\}/)
  assert.match(action, /h-11 w-11/)
  assert.doesNotMatch(action, /absolute right-3 top-3/)
  assert.match(action, /h-8 w-8/)
  assert.match(action, /useDeleteTitleMutation/)
  assert.match(action, /await deleteTitle\.mutateAsync\(title\.id\)/)
  assert.match(action, /<ConfirmationDialog/)
  assert.match(action, /loading=\{deleteTitle\.isPending\}/)
  assert.match(action, /error=\{deleteError\}/)
})
