import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { byName, Header, useFeedback } from '../../components/ui'
import { isCloud, useStore } from '../../data/store'
import { useClub } from '../../data/useClub'
import { uid } from '../../lib/engine'
import { navigate } from '../../lib/router'
import { membersOf, sameTeam } from '../../lib/training'
import { TEAMS } from '../../lib/types'
import { AccountRow, ClubCode, plural } from './parts'

/** Les équipes du club : le code d'inscription, puis une fiche par équipe. */
export function TeamsPage() {
  const { teams, members, sessions, save } = useStore()
  const { toast } = useFeedback()
  const club = useClub()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const exists = (team: string) => teams.some((t) => sameTeam(t.name, team))
  // équipes citées par un effectif ou une séance, mais pas encore ouvertes aux joueurs
  const unlisted: string[] = []
  for (const team of [...members.map((m) => m.team), ...sessions.map((s) => s.team)]) {
    if (team && !exists(team) && !unlisted.some((u) => sameTeam(u, team))) unlisted.push(team)
  }
  const orphans = club.accounts.filter((a) => !exists(a.team))

  const add = async (team: string, open = false) => {
    if (!team) return toast('Indique le nom de l’équipe.')
    if (exists(team)) return toast('Cette équipe existe déjà.')
    setSaving(true)
    try {
      const id = uid()
      await save('teams', { id, name: team, updatedAt: '' })
      setName('')
      if (open) navigate(`/equipes/${id}`)
    } catch (error) {
      toast((error as Error).message)
    }
    setSaving(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    add(name.trim())
  }

  return (
    <>
      <Header title="Équipes" />
      <main>
        {!isCloud && (
          <p className="warning-box" role="note">
            Les joueurs ne peuvent pas encore créer de compte : le serveur du club n’est pas branché.
          </p>
        )}
        {club.error && <p className="warning-box" role="alert">{club.error}</p>}
        {club.code && <ClubCode club={club} />}

        <section>
          <h2>Mes équipes</h2>
          {teams.length === 0 && <p className="muted">Ajoute une équipe pour pouvoir partager des systèmes et des séances.</p>}
          <ul className="list">
            {[...teams].sort(byName).map((team) => {
              const accounts = club.accounts.filter((a) => sameTeam(a.team, team.name)).length
              const roster = membersOf(members, team.name).length
              return (
                <li key={team.id}>
                  <a className="card team-row" href={`#/equipes/${team.id}`}>
                    <span className="avatar" aria-hidden="true">{team.name.slice(0, 4)}</span>
                    <span className="session-info">
                      <strong>{team.name}</strong>
                      <small>
                        {[isCloud && plural(accounts, 'inscrit'), `${roster} dans l’effectif`].filter(Boolean).join(' · ')}
                      </small>
                    </span>
                    <span className="chevron"><Icon name="next" /></span>
                  </a>
                </li>
              )
            })}
          </ul>
          <form className="inline-form" onSubmit={submit}>
            <input list="new-teams" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle équipe" aria-label="Nom de la nouvelle équipe" maxLength={30} />
            <datalist id="new-teams">{TEAMS.filter((t) => !exists(t)).map((t) => <option key={t} value={t} />)}</datalist>
            <button className="button primary" disabled={saving}>Ajouter</button>
          </form>
        </section>

        {unlisted.length > 0 && (
          <section className="card">
            <h2>À activer</h2>
            <p className="muted">Ces équipes figurent dans tes séances ou effectifs, mais les joueurs ne peuvent pas les rejoindre.</p>
            <div className="chips wrap">
              {unlisted.map((team) => (
                <button key={team} className="chip dashed" disabled={saving} onClick={() => add(team, true)}>
                  <Icon name="plus" /> {team}
                </button>
              ))}
            </div>
          </section>
        )}

        {orphans.length > 0 && (
          <section className="card">
            <h2>Joueurs sans équipe</h2>
            <ul className="accounts">
              {orphans.map((a) => <AccountRow key={a.user_id} account={a} teams={teams} club={club} />)}
            </ul>
          </section>
        )}
      </main>
    </>
  )
}
