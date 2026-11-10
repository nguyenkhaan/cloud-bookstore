export const customerPaths = {
  customerList: '/customers',
  customerDetail: (id: string) => `/customers/${encodeURIComponent(id)}`,
} as const
