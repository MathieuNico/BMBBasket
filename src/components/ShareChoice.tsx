import { useState } from 'react'
import { useStore } from '../data/store'
import { isSharedWith } from '../lib/sharing'
import { sameTeam } from '../lib/training'
import type { Play } from '../lib/types'
import { Icon } from './Icon'
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
    const removing = isSharedWith(play, team)
    const next = removing ? shared.filter((t) => !sameTeam(t, team)) : [...shared, team]
    try {
      await save('plays', { ...play, teams: next })
      toast(removing ? `Retiré pour ${team}` : `Partagé avec ${team}`)
    } catch (e) {
      toast((e as Error).message)
    }
    setSaving(false)
  }

  return (
    <section className="card">
      <div className="section-head">
        <h2>Partager aux joueurs</h2>
        <span className={shared.length ? 'badge success' : 'badge'}>{shared.length ? 'Partagé' : 'Privé'}</span>
      </div>
      {names.length > 0 ? (
        <>
          <div className="chips wrap">
            {names.map((name) => {
              const active = isSharedWith(play, name)
              return (
                <button key={name} className={active ? 'chip active' : 'chip'} aria-pressed={active} disabled={saving} onClick={() => toggle(name)}>
                  <Icon name={active ? 'check' : 'plus'} />
                  {name}
                </button>
              )
            })}
          </div>
          <p className="muted">Touche une équipe pour lui donner ou lui retirer l’accès.</p>
        </>
      ) : (
        <p className="muted">
          Ajoute d’abord une équipe dans l’onglet <a className="link" href="#/equipes">Équipes</a>.
        </p>
      )}
    </section>
  )
}
