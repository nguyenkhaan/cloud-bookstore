const catalogRoot = '/catalog'

export const catalogPaths = {
  categoryList: `${catalogRoot}/categories`,
  seriesList: `${catalogRoot}/series`,
  titleList: `${catalogRoot}/titles`,
  titleDetail: (titleId: string) => `${catalogRoot}/titles/${encodeURIComponent(titleId)}`,
  titlesForSeries: (seriesId: string) => `${catalogRoot}/titles?seriesId=${encodeURIComponent(seriesId)}`,
  editionDetail: (editionId: string) => `${catalogRoot}/editions/${encodeURIComponent(editionId)}`,
  copyDetail: (copyId: string) => `${catalogRoot}/copies/${encodeURIComponent(copyId)}`,
  suppliers: '/suppliers',
  stockReceipts: '/stock-receipts',
  stockOut: '/stock-out',
  inventoryCheck: '/inventory-check',
  stockAlerts: '/stock-alerts',
} as const
