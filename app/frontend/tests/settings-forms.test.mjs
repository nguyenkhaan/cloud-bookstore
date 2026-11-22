import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Run the real component handlers with deterministic query results and hook state.
function mount(file, name, data, roleCode = 'ADMIN') {
  const slots = [], effects = [], requests = []
  let cursor, changed, tree
  const query = { data, isLoading: false, isError: false, refetch: () => { query.retries++ }, retries: 0, saveResult: data }
  const location = { pathname: '/settings/rental' }
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; changed = true }]
    },
    useEffect(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((v, j) => v !== slots[i][j])) { slots[i] = deps; effects.push(fn) }
    },
    useMemo: fn => fn(),
  }
  const panels = Object.fromEntries(['ScrSys01RentalPolicy', 'ScrSys02MembershipTiers', 'ScrSys03RbacMatrix', 'ScrSys04Integrations'].map(n => [n, n]))
  const hooks = new Proxy({}, { get: (_, key) => () => String(key).startsWith('useUpdate')
    ? { isPending: query.mutationPending ?? false, mutateAsync: async body => { requests.push(JSON.parse(JSON.stringify(body))); return query.saveResult } }
    : query })
  const code = ts.transpileModule(readFileSync(new URL(`../src/features/settings/${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, React, require: id => {
    if (id === 'react') return React
    if (id.endsWith('settings.hook')) return hooks
    if (id === 'react-router-dom') return { Navigate: 'Navigate', useLocation: () => location, useNavigate: () => () => {} }
    if (id.endsWith('auth.hook')) return { useAuth: () => ({ session: { user: { roleCode } } }) }
    if (id.endsWith('settings.route')) return { settingsPaths: { rental: '/settings/rental', tiers: '/settings/tiers', rbac: '/admin/settings/rbac', integrations: '/admin/settings/integrations' } }
    return { ...panels, Button: 'button', TextField: 'input', ConfirmationDialog: 'confirmation', notify: { success() {}, error() {} }, MainLayout: 'MainLayout', SettingsTabBar: 'SettingsTabBar' }
  } })
  function render(props = { isAdmin: true }) {
    let count = 0
    do {
      changed = false; cursor = 0
      tree = exports[name](props)
      effects.splice(0).forEach(fn => fn())
      assert.ok(++count < 20, 'render must settle')
    } while (changed)
    return tree
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...nodes(node.props?.children), ...nodes(node.props?.actions)]
  }
  function text(node) { return typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '') }
  const find = predicate => nodes(tree).find(predicate)
  const input = id => find(n => n.props?.id === id)
  const button = label => find(n => n.type === 'button' && text(n).includes(label))
  render()
  return { query, location, requests, render, nodes: () => nodes(tree), input, button, find }
}

const rental = { maxExtensions: 3, extensionDaysPerTime: 8, gracePeriodHours: 1, latePenaltyRatePct: 160, damagePenalties: [], changeReason: 'Server reason' }
const tierItems = ['REGULAR', 'SILVER', 'GOLD'].map((name, rank) => ({ name, minSpend: rank * 1000000, maxBooks: 4, maxRentalDays: 10, rentDiscountPct: 0, saleDiscountPct: 0 }))
const tiers = { tiers: tierItems, changeReason: 'Server reason' }
const integrations = { vietQr: { bankName: 'Server bank' }, zaloOa: { appId: 'Server app' }, bookMetadata: { priorityService: 'Server lookup' }, smtp: { host: 'Server host' }, changeReason: 'Server reason' }
const forms = [
  ['ScrSys01RentalPolicy', rental, 'max-extensions-input', '9'],
  ['ScrSys02MembershipTiers', tiers, 'tier-change-reason', 'Draft reason'],
  ['ScrSys04Integrations', integrations, 'integrations-reason', 'Draft reason'],
]

for (const [name, data, id, value] of forms) {
  test(`${name}: failed GET blocks editing and offers retry`, () => {
    const form = mount(`components/${name}.tsx`, name)
    form.query.isError = true; form.render()
    assert.ok(form.find(n => n.props?.role === 'alert'))
    assert.equal(form.nodes().filter(n => ['input', 'textarea'].includes(n.type)).length, 0)
    form.button('Thử lại').props.onClick()
    assert.equal(form.query.retries, 1)
    form.query.isError = false; form.query.data = data; form.render()
    assert.ok(form.nodes().some(n => n.type === 'input'))
  })
  test(`${name}: refetch retains unsaved fields`, () => {
    const form = mount(`components/${name}.tsx`, name, data)
    if (name === 'ScrSys02MembershipTiers') { form.button('Lưu thay đổi hạng').props.onClick(); form.render() }
    form.input(id).props.onChange({ target: { value } }); form.render()
    form.query.data = { ...data, maxExtensions: 1, changeReason: 'Refetched reason' }; form.render()
    assert.equal(String(form.input(id).props.value), value)
  })
}

test('integration section saves omit every other draft and preserve drafts after success/refetch', async () => {
  const form = mount('components/ScrSys04Integrations.tsx', 'ScrSys04Integrations', integrations)
  const fields = [['vietQr', 'Lưu VietQR'], ['zaloOa', 'Lưu Zalo'], ['bookMetadata', 'Lưu metadata'], ['smtp', 'Lưu SMTP']]
  // Locate inputs by their current value so label/id changes do not affect this test.
  for (const value of ['Server bank', 'Server app', 'Server lookup', 'Server host']) {
    form.find(n => n.type === 'input' && n.props.value === value).props.onChange({ target: { value: `Draft ${value}` } }); form.render()
  }
  const savedSections = new Set()
  for (const [section, label] of fields) {
    await form.button(label).props.onClick()
    assert.deepEqual(Object.keys(form.requests.at(-1)).sort(), [section, 'changeReason'].sort())
    savedSections.add(section)
    form.query.data = structuredClone(integrations); form.render()
    for (const [i, value] of ['Server bank', 'Server app', 'Server lookup', 'Server host'].entries()) {
      assert.ok(form.find(n => n.type === 'input' && n.props.value === (savedSections.has(fields[i][0]) ? value : `Draft ${value}`)))
    }
  }
  await form.button('Lưu toàn bộ').props.onClick()
  assert.deepEqual(Object.keys(form.requests.at(-1)).sort(), ['vietQr', 'zaloOa', 'bookMetadata', 'smtp', 'changeReason'].sort())
})

test('membership save rejects invalid values and accepts discounts through 100%', async () => {
  const tier = { name: 'REGULAR', minSpend: 0, maxSpend: null, maxBooks: 4, maxRentalDays: 10, rentDiscountPct: 100, saleDiscountPct: 0 }
  for (const invalid of [{ minSpend: -1 }, { maxBooks: 0 }, { maxBooks: 1.5 }, { maxRentalDays: -1 }, { rentDiscountPct: 101 }, { saleDiscountPct: -1 }]) {
    const form = mount('components/ScrSys02MembershipTiers.tsx', 'ScrSys02MembershipTiers', { tiers: [{ ...tier, ...invalid }, ...tierItems.slice(1)], changeReason: 'Reason' })
    form.button('Lưu thay đổi hạng').props.onClick(); form.render()
    await form.button('Xác nhận áp dụng').props.onClick()
    assert.equal(form.requests.length, 0, JSON.stringify(invalid))
  }
  const form = mount('components/ScrSys02MembershipTiers.tsx', 'ScrSys02MembershipTiers', { tiers: [tier, ...tierItems.slice(1)], changeReason: 'Reason' })
  const discounts = form.nodes().filter(n => n.type === 'input' && n.props.min === '0' && n.props.max)
  assert.ok(discounts.length >= 2)
  assert.ok(discounts.every(n => n.props.max === '100'))
  form.button('Lưu thay đổi hạng').props.onClick(); form.render()
  await form.button('Xác nhận áp dụng').props.onClick()
  assert.equal(form.requests.length, 1)
})

test('membership requires all three server tiers before allowing edits', () => {
  for (const data of [{ tiers: [] }, { tiers: tierItems.slice(0, 2) }, {}]) {
    const form = mount('components/ScrSys02MembershipTiers.tsx', 'ScrSys02MembershipTiers', data)
    assert.ok(form.find(n => n.props?.role === 'alert'))
    assert.equal(form.nodes().filter(n => n.type === 'input').length, 0)
    assert.ok(form.button('Thử lại'))
  }
})

test('successful integration save replaces saved plaintext secrets but retains other drafts', async () => {
  const config = { ...integrations, vietQr: { ...integrations.vietQr, apiKey: '********' }, smtp: { ...integrations.smtp, password: '********' } }
  const form = mount('components/ScrSys04Integrations.tsx', 'ScrSys04Integrations', config)
  for (const [id, value] of [['vietqr-apikey', 'new-api-secret'], ['smtp-pass', 'unsaved-smtp-secret']]) {
    form.input(id).props.onChange({ target: { value } }); form.render()
  }
  await form.button('Lưu VietQR').props.onClick(); form.render()
  assert.equal(form.input('vietqr-apikey').props.value, '********')
  assert.equal(form.input('smtp-pass').props.value, 'unsaved-smtp-secret')
  await form.button('Lưu toàn bộ').props.onClick(); form.render()
  assert.equal(form.input('smtp-pass').props.value, '********')
})

test('integration fields cannot be edited while save is pending', () => {
  const form = mount('components/ScrSys04Integrations.tsx', 'ScrSys04Integrations', integrations)
  form.query.mutationPending = true; form.render()
  const controls = form.nodes().filter(n => ['input', 'select', 'textarea'].includes(n.type))
  assert.ok(controls.length > 10)
  assert.ok(controls.every(n => n.props.disabled === true))
})

test('membership threshold copy includes Gold minimum in Gold', () => {
  const source = readFileSync(new URL('../src/features/settings/components/ScrSys02MembershipTiers.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /goldTier.minSpend \+ 1/)
  assert.match(source, /đ ≤ chi tiêu &lt;/)
  assert.match(source, /Chi tiêu ≥/)
})

test('switching settings tabs keeps visited panels mounted and hidden', () => {
  const page = mount('pages/SettingsPage.tsx', 'default')
  page.location.pathname = '/settings/tiers'; page.render()
  const rentalPanel = page.find(n => n.type === 'ScrSys01RentalPolicy')
  assert.ok(rentalPanel, 'rental panel must remain mounted')
  assert.ok(page.find(n => n.props?.hidden === true && n.props.children.flat().includes(rentalPanel)))
  assert.ok(page.find(n => n.type === 'ScrSys02MembershipTiers'))
})

test('admin settings tabs are hidden from staff and direct admin URLs redirect before mounting', () => {
  const staffTabs = mount('components/SettingsTabBar.tsx', 'SettingsTabBar')
  staffTabs.render({ activeTab: 'rental', onSelectTab() {}, isAdmin: false })
  assert.equal(staffTabs.nodes().filter(n => n.type === 'button').length, 2)
  staffTabs.render({ activeTab: 'rental', onSelectTab() {}, isAdmin: true })
  assert.equal(staffTabs.nodes().filter(n => n.type === 'button').length, 4)

  const staffPage = mount('pages/SettingsPage.tsx', 'default', undefined, 'CASHIER')
  staffPage.location.pathname = '/admin/settings/rbac'; staffPage.render()
  assert.equal(staffPage.find(n => n.type === 'Navigate')?.props.to, '/settings/rental')
  assert.equal(staffPage.find(n => n.type === 'ScrSys03RbacMatrix'), undefined)

  const adminPage = mount('pages/SettingsPage.tsx', 'default')
  adminPage.location.pathname = '/admin/settings/rbac'; adminPage.render()
  assert.ok(adminPage.find(n => n.type === 'ScrSys03RbacMatrix'))
})

test('RBAC uses three boolean grants, locks protected rights and preserves dirty edits on refetch', async () => {
  const row = { permissionCode: 'BookTitles.CreateTitle', permissionName: 'Tạo đầu sách', moduleTitle: 'Đầu sách', cashierAllowed: false, warehouseAllowed: true, adminAllowed: true, adminOnly: false }
  const locked = { ...row, permissionCode: 'Settings.UpdateRbacMatrix', permissionName: 'Quản trị quyền', warehouseAllowed: false, adminOnly: true }
  const form = mount('components/ScrSys03RbacMatrix.tsx', 'ScrSys03RbacMatrix', { items: [row, locked] })
  let boxes = form.nodes().filter(n => n.type === 'input' && n.props.type === 'checkbox')
  assert.equal(boxes.length, 6)
  assert.ok(boxes.slice(3).every(n => n.props.disabled))
  boxes[0].props.onChange({ target: { checked: true } }); form.render()
  form.query.data = { items: [row, locked] }; form.render()
  boxes = form.nodes().filter(n => n.type === 'input' && n.props.type === 'checkbox')
  assert.equal(boxes[0].props.checked, true)
  form.find(n => n.props?.label === 'Lý do thay đổi quyền').props.onChange({ target: { value: 'Grant title creation' } }); form.render()
  form.button('Xem lại & Lưu quyền').props.onClick(); form.render()
  await form.button('Xác nhận lưu').props.onClick()
  assert.equal(form.requests[0].items[0].cashierAllowed, true)
  assert.equal(form.requests[0].changeReason, 'Grant title creation')
})

test('RBAC failed GET offers retry and cannot submit sample permissions', () => {
  const form = mount('components/ScrSys03RbacMatrix.tsx', 'ScrSys03RbacMatrix')
  form.query.isError = true; form.render()
  assert.ok(form.find(n => n.props?.role === 'alert'))
  assert.equal(form.nodes().filter(n => n.props?.type === 'checkbox').length, 0)
  form.button('Thử lại').props.onClick()
  assert.equal(form.query.retries, 1)
})
