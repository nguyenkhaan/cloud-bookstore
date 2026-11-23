import { useState } from 'react'

type SeriesCoverStackProps = {
  imageUrl: string | null
  name: string
  titleCount?: number | null
}

/**
 * Stacked-volume cover for a book series. The front cover opens around its spine
 * when an ancestor with the `group` class is hovered or keyboard-focused.
 */
export function SeriesCoverStack({ imageUrl, name, titleCount }: SeriesCoverStackProps) {
  const [failed, setFailed] = useState(false)
  const coverUrl = failed ? null : imageUrl

  return (
    <div className="relative mr-3 aspect-[2/3] w-28 shrink-0 perspective-[700px]">
      <div aria-hidden="true" className="absolute inset-0 translate-x-2.5 -translate-y-1.5 rounded-lg border border-white bg-slate-200" />
      <div aria-hidden="true" className="absolute inset-0 translate-x-1 -translate-y-0.5 rounded-lg border border-white bg-slate-300" />

      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-end justify-end rounded-r-lg bg-white p-2 shadow-[inset_6px_0_8px_-6px_rgba(15,23,42,0.2)] ring-1 ring-slate-200"
      >
        <span className="text-[10px] font-bold text-slate-600">{`${titleCount ?? 0} tập`}</span>
      </div>

      <div className="absolute inset-0 origin-left overflow-hidden rounded-lg shadow-md backface-hidden transition-[transform,box-shadow] duration-[450ms] ease-out group-hover:-rotate-y-62 group-hover:shadow-xl group-focus-visible:-rotate-y-62 group-focus-visible:shadow-xl motion-reduce:transition-none motion-reduce:group-hover:rotate-y-0 motion-reduce:group-focus-visible:rotate-y-0">
        {coverUrl ? (
          <img
            alt={`Ảnh bìa bộ sách ${name}`}
            className="size-full object-cover object-top"
            decoding="async"
            loading="lazy"
            onError={() => setFailed(true)}
            src={coverUrl}
          />
        ) : (
          <div className="grid size-full place-items-center bg-linear-to-br from-indigo-700 via-indigo-600 to-sky-500 text-3xl font-black text-white">
            <span aria-hidden="true">{name.trim().charAt(0).toUpperCase() || 'S'}</span>
            <span className="sr-only">Chưa có ảnh bìa cho {name}</span>
          </div>
        )}
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-r from-black/25 to-transparent" />
      </div>
    </div>
  )
}
