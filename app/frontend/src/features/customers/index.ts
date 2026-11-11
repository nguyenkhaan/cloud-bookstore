export { default as CustomerListPage } from './pages/CustomerListPage'
export { default as CustomerDetailPage } from './pages/CustomerDetailPage'
export { AddCustomerDialog } from './components/AddCustomerDialog'
export type { AddCustomerDialogProps } from './components/AddCustomerDialog'
export { EditCustomerDialog } from './components/EditCustomerDialog'
export type { EditCustomerDialogProps } from './components/EditCustomerDialog'
export { ExportCustomerDialog } from './components/ExportCustomerDialog'
export type { ExportCustomerDialogProps } from './components/ExportCustomerDialog'
export { exportCustomersToFile } from './customers.export'
export type { CustomerExportFormat } from './customers.export'
export { customerPaths } from './customers.route'
export {
  useCheckDuplicate,
  useCreateCustomer,
  useCustomer,
  useCustomers,
  useCustomerStats,
  useDeleteCustomer,
  useUpdateCustomer,
} from './customers.hook'
export type {
  Customer,
  CustomerListFilters,
  CustomerStats,
  PagedResult,
} from './customers.type'
