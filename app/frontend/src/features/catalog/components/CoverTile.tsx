import { cn } from '@/lib/cn'
import { BookOpen } from 'lucide-react'

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
    <div className={cn('flex flex-col items-center justify-center gap-2 bg-slate-100 px-2 text-center text-slate-500', className)}>
      <BookOpen aria-hidden="true" size={22} strokeWidth={1.5} />
      <span className="text-[10px] font-medium leading-4">Chưa có ảnh bìa</span>
      <span className="sr-only">{title}</span>
    </div>
  )
}
