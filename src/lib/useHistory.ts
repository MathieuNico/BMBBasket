import { useState } from 'react'

/** Valeur en cours d'édition, avec annuler et rétablir. */
export function useHistory<T extends object>(initial: () => T) {
  const [state, setState] = useState(() => {
    const first = initial()
    return { first, past: [] as T[], value: first, future: [] as T[] }
  })

  return {
    value: state.value,
    dirty: state.value !== state.first,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    /** Saisie de texte : pas d'entrée d'historique pour chaque lettre. */
    patch: (changes: Partial<T>) => setState((s) => ({ ...s, value: { ...s.value, ...changes } })),
    /** Modification annulable. */
    commit: (changes: Partial<T>) =>
      setState((s) => ({ ...s, past: [...s.past.slice(-60), s.value], value: { ...s.value, ...changes }, future: [] })),
    undo: () =>
      setState((s) => {
        const previous = s.past.at(-1)
        if (!previous) return s
        return { ...s, past: s.past.slice(0, -1), value: previous, future: [s.value, ...s.future] }
      }),
    redo: () =>
      setState((s) => {
        const next = s.future[0]
        if (!next) return s
        return { ...s, past: [...s.past, s.value], value: next, future: s.future.slice(1) }
      }),
  }
}
