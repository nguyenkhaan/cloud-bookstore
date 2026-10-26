import { CheckIcon } from './Icons'

export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol aria-label="Các bước kích hoạt" className="cb-steps">
      {steps.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo'
        return (
          <li aria-current={state === 'active' ? 'step' : undefined} className={`cb-step cb-step--${state}`} key={label}>
            {state === 'done' && <CheckIcon />} {index + 1}. {label}
          </li>
        )
      })}
    </ol>
  )
}
