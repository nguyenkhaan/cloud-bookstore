import { useState } from 'react'

type TitleCoverStackProps = {
  imageUrl: string | null
  name: string
}

export function TitleCoverStack({ imageUrl, name }: TitleCoverStackProps) {
  const [failed, setFailed] = useState(false)
  const coverUrl = failed ? null : imageUrl

  return (
    <div className="relative h-25 w-[72px] shrink-0 perspective-[600px]">
      <div aria-hidden="true" className="absolute inset-y-1 left-1 right-0 translate-x-2 rounded-r-md border border-slate-200 bg-white shadow-[inset_5px_0_7px_-6px_rgba(15,23,42,0.22)]" />
      <div aria-hidden="true" className="absolute inset-y-2 right-0 w-2 translate-x-2 rounded-r-md border border-slate-200 bg-slate-100 shadow-sm" />
      <div aria-hidden="true" className="absolute inset-y-3 right-0 w-1 translate-x-2 bg-slate-300" />

      <div className="absolute inset-0 origin-left overflow-hidden rounded-lg shadow-md backface-hidden transition-[transform,box-shadow] duration-[450ms] ease-out group-hover:-rotate-y-62 group-hover:shadow-xl group-focus-within:-rotate-y-62 group-focus-within:shadow-xl motion-reduce:transition-none motion-reduce:group-hover:rotate-y-0 motion-reduce:group-focus-within:rotate-y-0">
        {coverUrl ? (
          <img
            alt={`Bìa ${name}`}
            className="size-full object-cover object-top"
            decoding="async"
            loading="lazy"
            onError={() => setFailed(true)}
            src={coverUrl}
          />
        ) : (
          <div className="grid size-full place-items-center bg-linear-to-br from-indigo-700 via-indigo-600 to-sky-500 text-center text-lg font-black text-white">
            <span aria-hidden="true">{name.trim().charAt(0).toUpperCase() || 'S'}</span>
            <span className="sr-only">Chưa có ảnh bìa cho {name}</span>
          </div>
        )}
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-r from-black/25 to-transparent" />
      </div>
    </div>
  )
}
