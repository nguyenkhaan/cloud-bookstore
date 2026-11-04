import { cn } from '@/lib/cn'

type CoverTileProps = {
  imageUrl?: string | null
  title: string
  className?: string
}

export function CoverTile({ imageUrl, title, className }: CoverTileProps) {
  if (imageUrl) {
    return <img alt={`Bìa ${title}`} className={cn('object-cover', className)} src={imageUrl} />
  }

  return (
    <div className={cn('grid place-items-center bg-linear-to-br from-indigo-700 via-indigo-600 to-sky-500 text-center text-lg font-black text-white', className)}>
      <span aria-hidden="true">{title.trim().charAt(0).toUpperCase() || 'S'}</span>
      <span className="sr-only">Chưa có ảnh bìa cho {title}</span>
    </div>
  )
}
