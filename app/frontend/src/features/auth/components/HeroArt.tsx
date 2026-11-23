const palette = ['#c2410c', '#1e40af', '#166534', '#b45309', '#7c2d12', '#4338ca', '#0f766e', '#be123c']
const heights = [78, 92, 66, 86, 72, 96, 70, 82, 90, 64, 88, 74, 94, 68, 84, 76]

const shelves = [0, 3, 5].map((offset) =>
    heights.map((height, index) => ({
        height: heights[(index + offset) % heights.length] ?? height,
        color: palette[(index * 3 + offset) % palette.length] ?? '#7c2d12',
    })),
)

/** Minh họa kệ sách bằng CSS. Thay bằng ảnh thật (login-hero.webp) khi có file. */
export function HeroArt() {
    return (
        <div aria-hidden="true" className="flex flex-col justify-between gap-3.5 rounded-[18px] bg-[linear-gradient(160deg,#f4c97a_0%,#b9722c_55%,#5b3414_100%)] px-[22px] pb-4 pt-[22px]">
            {shelves.map((books, shelfIndex) => (
                <div className="flex h-[92px] items-end gap-[3px] border-b-[6px] border-[#4a2a10] pb-1.5" key={shelfIndex}>
                    {books.map((book, bookIndex) => (
                        <span className="flex-1 rounded-t-sm opacity-90" key={bookIndex} style={{ height: `${book.height}%`, background: book.color }} />
                    ))}
                </div>
            ))}
        </div>
    )
}
