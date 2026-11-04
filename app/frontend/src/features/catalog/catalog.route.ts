const catalogRoot = '/catalog'

export const catalogPaths = {
  seriesList: `${catalogRoot}/series`,
  titleList: `${catalogRoot}/titles`,
  titleDetail: (titleId: string) => `${catalogRoot}/titles/${encodeURIComponent(titleId)}`,
  titlesForSeries: (seriesId: string) => `${catalogRoot}/titles?seriesId=${encodeURIComponent(seriesId)}`,
  editionDetail: (editionId: string) => `${catalogRoot}/editions/${encodeURIComponent(editionId)}`,
  copyDetail: (copyId: string) => `${catalogRoot}/copies/${encodeURIComponent(copyId)}`,
} as const
