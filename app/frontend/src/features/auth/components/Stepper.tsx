import { CheckIcon } from './Icons'
import { cn } from '@/lib/cn'

export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol aria-label="Các bước kích hoạt" className="mt-5.5 flex list-none gap-1 rounded-xl bg-indigo-50 p-1.5">
      {steps.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo'
        return (
          <li
            aria-current={state === 'active' ? 'step' : undefined}
            className={cn(
              'flex flex-1 items-center justify-center gap-1 rounded-lg px-1 py-2 text-center text-xs text-slate-500 sm:px-2.5 sm:text-[13px]',
              state === 'active' && 'bg-white font-semibold text-indigo-700 shadow-xs',
              state === 'done' && 'text-emerald-700',
            )}
            key={label}
          >
            {state === 'done' && <CheckIcon />} {index + 1}. {label}
          </li>
        )
      })}
    </ol>
  )
}
