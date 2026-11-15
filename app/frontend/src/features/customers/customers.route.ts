export const customerPaths = {
  customerList: '/customers',
  customerDetail: (id: string) => `/customers/${encodeURIComponent(id)}`,
} as const

/** Link về chứng từ nguồn. `null` = chưa có trang đích (phase 05/07/08/09). */
export const sourceDocumentPaths = {
  copy: (copyId: string): string => `/catalog/copies/${encodeURIComponent(copyId)}`,
  rentalSlip: (_slipId: string): string | null => null,
  saleInvoice: (_invoiceId: string): string | null => null,
  stockReceipt: (_receiptId: string): string | null => null,
} as const
