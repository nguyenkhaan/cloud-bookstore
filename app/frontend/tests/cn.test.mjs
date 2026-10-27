import assert from 'node:assert/strict'
import test from 'node:test'
import { cn } from '../src/lib/cn.ts'

test('consumer Tailwind classes override defaults and false conditions are omitted', () => {
  assert.equal(cn('px-3.5 text-sm', false && 'hidden', 'px-6'), 'text-sm px-6')
})
