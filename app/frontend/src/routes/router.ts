import { useSyncExternalStore } from 'react'

export type LocationState = { pathname: string; search: string }

export const navigate = (to: string, replace = false) => {
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

const getSnapshot = () => `${window.location.pathname}${window.location.search}`

export function useLocation(): LocationState {
  const current = useSyncExternalStore(subscribe, getSnapshot)
  const searchStart = current.indexOf('?')
  return searchStart === -1
    ? { pathname: current, search: '' }
    : { pathname: current.slice(0, searchStart), search: current.slice(searchStart) }
}
