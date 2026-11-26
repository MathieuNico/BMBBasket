import { useState } from 'react'
import { useStore } from '../data/store'
import { isSharedWith } from '../lib/sharing'
import { sameTeam } from '../lib/training'
import type { Play } from '../lib/types'
import { useFeedback } from './ui'

/** Choix des équipes dont les joueurs peuvent consulter un système. */
export function ShareChoice({ play }: { play: Play }) {
  const { teams, save } = useStore()
  const { toast } = useFeedback()
  const [saving, setSaving] = useState(false)
  const shared = play.teams ?? []
  // une équipe supprimée reste listée pour pouvoir être décochée
  const orphans = shared.filter((name) => !teams.some((t) => sameTeam(t.name, name)))
  const names = [...teams.map((t) => t.name), ...orphans].sort((a, b) => a.localeCompare(b, 'fr'))

  const toggle = async (team: string) => {
    setSaving(true)
    const next = isSharedWith(play, team) ? shared.filter((t) => !sameTeam(t, team)) : [...shared, team]
    try {
      await save('plays', { ...play, teams: next })
    } catch (e) {
      toast((e as Error).message)
    }
    setSaving(false)
  }

  return (
    <section className="card">
      <h2>Partage aux joueurs</h2>
      {names.length > 0 ? (
        <>
          <div className="chips wrap">
            {names.map((name) => {
              const active = isSharedWith(play, name)
              return (
                <button key={name} className={active ? 'chip active' : 'chip'} aria-pressed={active} disabled={saving} onClick={() => toggle(name)}>
                  {name}
                </button>
              )
            })}
          </div>
          <p className="muted">
            {shared.length ? `Visible par les joueurs : ${shared.join(', ')}.` : 'Réservé aux coachs. Touche une équipe pour le publier.'}
          </p>
        </>
      ) : (
        <p className="muted">
          Ajoute d’abord une équipe dans l’onglet <a className="link" href="#/joueurs">Joueurs</a>.
        </p>
      )}
    </section>
  )
}
