import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let policy

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  policy = await server.ssrLoadModule('/src/routes/screen-access.policy.ts')
})

after(async () => {
  await server?.close()
})

const source = (relativePath) => readFileSync(new URL(`../src/${relativePath}`, import.meta.url), 'utf8')

test('catalog and customer action ceilings match the role matrix', () => {
  for (const screenId of ['catalogCategories', 'catalogSeries', 'catalogTitles', 'catalogTitleDetail', 'catalogEditionDetail', 'catalogCopyDetail']) {
    assert.equal(policy.getEffectiveAccess(screenId, 'CASHIER'), 'R')
    assert.equal(policy.getEffectiveAccess(screenId, 'ADMIN'), 'U')
    assert.equal(policy.getEffectiveAccess(screenId, 'INVENTORY_MANAGER'), 'U')
  }

  assert.equal(policy.getEffectiveAccess('customers', 'CASHIER'), 'U')
  assert.equal(policy.getEffectiveAccess('customerDetail', 'CASHIER'), 'R')
  assert.equal(policy.getEffectiveAccess('customerDetail', 'ADMIN'), 'U')
  assert.equal(policy.getEffectiveAccess('customerDetail', 'INVENTORY_MANAGER'), 'R')
})

test('catalog action screens use screen access and exact permissions', () => {
  const files = [
    ['features/catalog/pages/CategoryTreePage.tsx', ['Categories.CreateCategory', 'Categories.UpdateCategory', 'Categories.UpdateCategoryStatus', 'Categories.DeleteCategory']],
    ['features/catalog/pages/SeriesListPage.tsx', ['BookSeries.CreateBookSeries']],
    ['features/catalog/pages/TitleListPage.tsx', ['BookTitles.CreateTitle']],
    ['features/catalog/pages/TitleDetailPage.tsx', ['BookTitles.UpdateTitle', 'Editions.CreateEdition']],
    ['features/catalog/pages/EditionDetailPage.tsx', ['Editions.UpdateEdition', 'Editions.DeleteEdition', 'Editions.UpdateEditionStatus', 'BookCopies.CreateBookCopy']],
    ['features/catalog/pages/CopyDetailPage.tsx', ['BookCopies.UpdateBookCopy', 'BookCopies.DeleteBookCopy', 'BookCopies.UpdateBookCopyStatus', 'BookCopies.CreateBookCopyLabel']],
    ['features/catalog/components/BookCopyLifecycleDrawer.tsx', ['BookCopies.CreateBookCopyLabel', 'BookCopies.UpdateBookCopyShelf']],
    ['features/catalog/pages/SuppliersPage.tsx', ['Suppliers.CreateSupplier', 'Suppliers.UpdateSupplier', 'Suppliers.UpdateSupplierStatus', 'Suppliers.DeleteSupplier']],
    ['features/catalog/pages/StockAlertsPage.tsx', ['Editions.UpdateEditionThresholds']],
  ]

  for (const [file, permissions] of files) {
    const content = source(file)
    assert.match(content, /useScreenAccess\(/, `${file} must use the shared screen policy`)
    assert.match(content, /usePermissions\(/, `${file} must use live permissions`)
    for (const permission of permissions) assert.match(content, new RegExp(`can\\(['"]${permission.replace('.', '\\.')}`), `${file} is missing ${permission}`)
    assert.doesNotMatch(content, /\[['"]ADMIN['"],\s*['"]INVENTORY_MANAGER['"]\]\.?includes\(/, `${file} still gates actions by raw role`)
  }
})

test('customer actions and settings writes are permission-gated', () => {
  const customerList = source('features/customers/pages/CustomerListPage.tsx')
  const customerDetail = source('features/customers/pages/CustomerDetailPage.tsx')
  assert.match(customerList, /useScreenAccess\(['"]customers['"]\)/)
  assert.match(customerList, /can\(['"]Customers\.CreateCustomer['"]\)/)
  assert.match(customerDetail, /useScreenAccess\(['"]customerDetail['"]\)/)
  assert.match(customerDetail, /can\(['"]Customers\.UpdateCustomer['"]\)/)

  for (const file of [
    'features/settings/components/ScrSys01RentalPolicy.tsx',
    'features/settings/components/ScrSys02MembershipTiers.tsx',
    'features/settings/components/ScrSys03RbacMatrix.tsx',
    'features/settings/components/ScrSys04Integrations.tsx',
  ]) {
    const content = source(file)
    assert.match(content, /usePermissions\(/, `${file} must use live permissions`)
    assert.match(content, /can\(/, `${file} must gate writes by exact permission`)
  }
})
