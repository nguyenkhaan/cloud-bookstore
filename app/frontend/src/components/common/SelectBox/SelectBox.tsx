import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { filterOptions, getMatchRange, moveActiveIndex } from './selectBox.utils'
import type { SelectOption } from './selectBox.utils'

type SelectBoxProps<T extends string> = {
  label: string
  value: T | ''
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  emptyHint?: string
  disabled?: boolean
  className?: string
}

type MenuPosition = { left: number; width: number; top?: number; bottom?: number }

const MENU_GAP = 6
const MENU_ESTIMATED_HEIGHT = 300

function renderLabel(label: string, query: string): ReactNode {
  const range = getMatchRange(label, query)
  if (!range) return label
  const [start, end] = range
  return (
    <>
      {label.slice(0, start)}
      <mark className="rounded-sm bg-indigo-100 px-px text-inherit">{label.slice(start, end)}</mark>
      {label.slice(end)}
    </>
  )
}

export function SelectBox<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Chọn…',
  searchPlaceholder = 'Tìm…',
  emptyMessage = 'Không có lựa chọn nào.',
  emptyHint,
  disabled = false,
  className,
}: SelectBoxProps<T>) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const listboxId = `${baseId}-listbox`
  const optionId = (index: number) => `${baseId}-option-${index}`

  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)

  const visibleOptions = useMemo(() => filterOptions(options, query), [options, query])
  const selectedOption = options.find((option) => option.value === value)

  const open = () => {
    if (disabled) return
    setQuery('')
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
    setIsOpen(true)
  }

  const close = (restoreFocus = true) => {
    setIsOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  const choose = (option: SelectOption<T>) => {
    onChange(option.value)
    close()
  }

  // Keep the portal menu glued to the field; flip above when there is no room below.
  useLayoutEffect(() => {
    if (!isOpen) return
    // Inside an aria-modal dialog, content outside the dialog is hidden from assistive tech,
    // so render the menu within the dialog (fixed positioning still escapes its overflow).
    setPortalTarget(wrapperRef.current?.closest('[role="dialog"]') ?? document.body)
    const update = () => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < MENU_ESTIMATED_HEIGHT && rect.top > spaceBelow
      setPosition(openUp
        ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + MENU_GAP }
        : { left: rect.left, width: rect.width, top: rect.bottom + MENU_GAP })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen])

  // The menu mounts one render after opening (once its position is known), so focus the search
  // input only when it exists.
  const isMenuRendered = isOpen && position !== null
  useEffect(() => {
    if (isMenuRendered) searchRef.current?.focus()
  }, [isMenuRendered])

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (wrapperRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return
    document.getElementById(`${baseId}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, baseId, isOpen])

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      open()
    }
  }

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Home':
      case 'End':
        event.preventDefault()
        setActiveIndex((current) => moveActiveIndex(event.key as 'ArrowDown', current, visibleOptions.length))
        break
      case 'Enter': {
        event.preventDefault()
        const option = visibleOptions[activeIndex]
        if (option) choose(option)
        break
      }
      case 'Escape':
        // Close only this menu; do not let a surrounding dialog treat Escape as "close dialog".
        event.preventDefault()
        event.stopPropagation()
        close()
        break
      case 'Tab':
        event.preventDefault()
        close()
        break
    }
  }

  const resultLabel = `${visibleOptions.length} kết quả`

  return (
    <div
      className={cn(
        'block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 transition-[border-color,box-shadow] focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15 motion-reduce:transition-none',
        isOpen && 'border-indigo-600 ring-3 ring-indigo-600/15',
        disabled && 'opacity-60',
        className,
      )}
      ref={wrapperRef}
    >
      <span className="block text-xs font-semibold text-slate-500" id={labelId}>{label}</span>
      <button
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${labelId} ${baseId}-value`}
        className="mt-1 flex w-full items-center justify-between gap-2 text-left text-[15px] text-indigo-950 outline-none disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        <span className={cn('min-w-0 truncate', !selectedOption && 'text-slate-400')} id={`${baseId}-value`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none', isOpen && 'rotate-180')} />
      </button>

      {isOpen && position && portalTarget && createPortal(
        <div
          className="fixed z-[60] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18),0_2px_6px_rgba(15,23,42,0.06)]"
          // Clicking the scrollbar, footer or empty space must not move focus off the search input,
          // otherwise Escape would bubble to a surrounding dialog and close it.
          onMouseDown={(event) => {
            if (event.target !== searchRef.current) event.preventDefault()
          }}
          ref={menuRef}
          style={position}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-2">
            <Search aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
            <input
              aria-activedescendant={activeIndex >= 0 && visibleOptions[activeIndex] ? optionId(activeIndex) : undefined}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={isOpen}
              aria-label={`Tìm trong ${label}`}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-indigo-950 outline-none placeholder:text-slate-400"
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              ref={searchRef}
              role="combobox"
              value={query}
            />
          </div>

          <ul aria-labelledby={labelId} className="max-h-60 overflow-auto p-1.5" id={listboxId} role="listbox">
            {visibleOptions.map((option, index) => {
              const isSelected = option.value === value
              return (
                <li
                  aria-selected={isSelected}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700',
                    index === activeIndex && 'bg-indigo-50 text-indigo-800',
                    isSelected && 'font-bold text-indigo-700',
                  )}
                  id={optionId(index)}
                  key={option.value}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                >
                  <span className="min-w-0 truncate">{renderLabel(option.label, query)}</span>
                  {isSelected && <Check aria-hidden="true" className="size-4 shrink-0 text-indigo-600" />}
                </li>
              )
            })}
          </ul>

          {options.length === 0 ? (
            <div className="px-3 pt-2 pb-4 text-center text-[13px] text-slate-500">
              <p>{emptyMessage}</p>
              {emptyHint && <p className="mt-1 text-[11px] text-slate-400">{emptyHint}</p>}
            </div>
          ) : visibleOptions.length === 0 ? (
            <p className="px-3 pt-2 pb-4 text-center text-[13px] text-slate-500">Không tìm thấy kết quả phù hợp</p>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
            <span aria-live="polite">{resultLabel}</span>
            <span aria-hidden="true">↑↓ chọn · Enter · Esc</span>
          </div>
        </div>,
        portalTarget,
      )}
    </div>
  )
}
