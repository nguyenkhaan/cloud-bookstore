const catalogRoot = '/catalog'

export const catalogPaths = {
  categoryList: `${catalogRoot}/categories`,
  seriesList: `${catalogRoot}/series`,
  titleList: `${catalogRoot}/titles`,
  titleDetail: (titleId: string) => `${catalogRoot}/titles/${encodeURIComponent(titleId)}`,
  titlesForSeries: (seriesId: string) => `${catalogRoot}/titles?seriesId=${encodeURIComponent(seriesId)}`,
  editionDetail: (editionId: string) => `${catalogRoot}/editions/${encodeURIComponent(editionId)}`,
  copyDetail: (copyId: string) => `${catalogRoot}/copies/${encodeURIComponent(copyId)}`,
  suppliers: `${catalogRoot}/suppliers`,
  stockReceipts: `${catalogRoot}/stock-receipts`,
  stockOut: `${catalogRoot}/stock-out`,
  inventoryCheck: `${catalogRoot}/inventory-check`,
} as const
