import { useEffect, useState } from 'react'

type Guard = () => Promise<boolean>

let guard: Guard | null = null
let current = location.hash
const listeners = new Set<() => void>()

const publish = () => {
  current = location.hash
  listeners.forEach((l) => l())
  window.scrollTo(0, 0)
}

window.addEventListener('hashchange', async () => {
  const target = location.hash
  if (target === current) return
  if (guard) {
    // on reste sur la page tant que la question n'a pas reçu de réponse
    history.replaceState(null, '', current || '#/')
    if (!(await guard())) return
    guard = null
    history.replaceState(null, '', target || '#/')
  }
  publish()
})

export const navigate = (path: string, { replace = false } = {}) => {
  if (replace) {
    history.replaceState(null, '', `#${path}`)
    publish()
  } else location.hash = path
}

/** Demande confirmation avant de quitter la page tant que `active` est vrai. */
export function useLeaveGuard(active: boolean, ask: Guard) {
  useEffect(() => {
    if (!active) return
    guard = ask
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => {
      guard = null
      window.removeEventListener('beforeunload', warn)
    }
  }, [active, ask])
}

export const releaseGuard = () => {
  guard = null
}

export function useRoute() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const listener = () => setTick((n) => n + 1)
    listeners.add(listener)
    return () => void listeners.delete(listener)
  }, [])
  return current.replace(/^#\/?/, '').split('/').filter(Boolean)
}
