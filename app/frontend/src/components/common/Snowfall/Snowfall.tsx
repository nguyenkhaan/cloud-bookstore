import type { CSSProperties } from 'react'

type SnowflakeStyle = CSSProperties & {
  '--snow-left': string
  '--snow-size': string
  '--snow-duration': string
  '--snow-delay': string
  '--snow-drift': string
  '--snow-opacity': string
}

const SNOWFLAKES = Array.from({ length: 32 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  size: `${3 + (index % 4)}px`,
  duration: `${10 + (index % 7)}s`,
  delay: `-${(index * 3) % 14}s`,
  drift: `${(index % 2 === 0 ? 1 : -1) * (18 + (index % 5) * 7)}px`,
  opacity: `${0.42 + (index % 4) * 0.1}`,
}))

export function Snowfall() {
  return (
    <div aria-hidden="true" className="snowfall-overlay">
      {SNOWFLAKES.map((flake, index) => {
        const style: SnowflakeStyle = {
          '--snow-left': flake.left,
          '--snow-size': flake.size,
          '--snow-duration': flake.duration,
          '--snow-delay': flake.delay,
          '--snow-drift': flake.drift,
          '--snow-opacity': flake.opacity,
        }

        return <span className="snowfall-flake" key={index} style={style} />
      })}
    </div>
  )
}
