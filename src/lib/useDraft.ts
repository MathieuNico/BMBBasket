import { useCallback, useState } from 'react'
import { useFeedback } from '../components/ui'
import { useLeaveGuard } from './router'

/** Fiche en cours de saisie : suivie des modifications et question avant de quitter. */
export function useDraft<T extends { updatedAt: string }>(initial: () => T, stored: T | undefined) {
  const { confirm } = useFeedback()
  const [state, setState] = useState(() => {
    const first = initial()
    return { saved: first, draft: first }
  })
  const dirty = state.draft !== state.saved

  // reprend la version d'un autre coach tant que rien n'est en cours de saisie ici
  if (stored && !dirty && stored.updatedAt > state.saved.updatedAt) setState({ saved: stored, draft: stored })

  const askLeave = useCallback(() => confirm('Quitter sans enregistrer les modifications ?', 'Quitter'), [confirm])
  useLeaveGuard(dirty, askLeave)

  return {
    draft: state.draft,
    dirty,
    patch: (changes: Partial<T>) => setState((s) => ({ ...s, draft: { ...s.draft, ...changes } })),
    markSaved: (value: T) => setState({ saved: value, draft: value }),
  }
}
