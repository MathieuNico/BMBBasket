import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { byName, Header, NotFound, useFeedback } from '../../components/ui'
import { isCloud, useStore } from '../../data/store'
import { useClub } from '../../data/useClub'
import { uid } from '../../lib/engine'
import { navigate } from '../../lib/router'
import { playerContent } from '../../lib/sharing'
import { membersOf, sameTeam } from '../../lib/training'
import type { Team } from '../../lib/types'
import { AccountRow, MemberRow, plural, useAction } from './parts'

export function TeamPage({ id }: { id: string }) {
  const { teams } = useStore()
  const team = teams.find((t) => t.id === id)
  return team ? <TeamView team={team} /> : <NotFound back="/equipes" text="Cette équipe n’existe plus." />
}

function TeamView({ team }: { team: Team }) {
  const store = useStore()
  const { confirm, toast } = useFeedback()
  const club = useClub()
  const run = useAction()
  const [part, setPart] = useState<'accounts' | 'roster'>(isCloud ? 'accounts' : 'roster')
  const [names, setNames] = useState('')
  const [saving, setSaving] = useState(false)
  const content = playerContent(store, team.name)
  const accounts = club.accounts.filter((a) => sameTeam(a.team, team.name)).sort(byName)
  const roster = membersOf(store.members, team.name)

  const addMembers = async (e: FormEvent) => {
    e.preventDefault()
    const list = names.split('\n').map((n) => n.trim()).filter(Boolean)
    if (!list.length) return toast('Écris au moins un nom.')
    setSaving(true)
    let done = 0
    try {
      for (const name of list) {
        await store.save('members', { id: uid(), name: name.slice(0, 60), team: team.name, updatedAt: '' })
        done++
      }
      toast(`${plural(done, 'joueur')} ajouté${done > 1 ? 's' : ''}`)
    } catch (error) {
      toast((error as Error).message)
    }
    // les noms pas encore enregistrés restent dans le champ
    setNames(list.slice(done).join('\n'))
    setSaving(false)
  }

  const erase = async () => {
    const warning = accounts.length ? ` Ses joueurs inscrits ne verront plus rien : change-les d’équipe d’abord.` : ''
    if (!(await confirm(`Supprimer l’équipe ${team.name} ?${warning} Les systèmes, séances et effectifs sont conservés.`, 'Supprimer'))) return
    run(async () => {
      await store.remove('teams', team.id)
      navigate('/equipes', { replace: true })
    })
  }

  return (
    <>
      <Header title={team.name} back="/equipes" />
      <main>
        <div className="stats">
          <div className="card"><b>{content.plays.length}</b><small>système{content.plays.length > 1 ? 's' : ''} partagé{content.plays.length > 1 ? 's' : ''}</small></div>
          <div className="card"><b>{content.sessions.length}</b><small>séance{content.sessions.length > 1 ? 's' : ''} partagée{content.sessions.length > 1 ? 's' : ''}</small></div>
        </div>
        <a className="button soft" href={`#/apercu/${team.id}`}><Icon name="eye" /> Voir comme un joueur</a>

        <div className="segmented">
          <button className={part === 'accounts' ? 'active' : ''} aria-pressed={part === 'accounts'} onClick={() => setPart('accounts')}>Comptes</button>
          <button className={part === 'roster' ? 'active' : ''} aria-pressed={part === 'roster'} onClick={() => setPart('roster')}>Effectif</button>
        </div>

        {part === 'accounts' ? (
          <section>
            <p className="muted">Les joueurs qui ont créé un compte : ils consultent ce que tu partages.</p>
            {club.error && <p className="warning-box" role="alert">{club.error}</p>}
            {accounts.length ? (
              <ul className="accounts card">
                {accounts.map((a) => <AccountRow key={a.user_id} account={a} teams={store.teams} club={club} />)}
              </ul>
            ) : (
              <p className="card muted">
                {isCloud ? 'Aucun inscrit pour le moment. Envoie le code du club depuis l’écran Équipes.' : 'Disponible une fois le serveur branché.'}
              </p>
            )}
          </section>
        ) : (
          <section>
            <p className="muted">La liste qui sert à pointer les présences. Le prénom et l’initiale suffisent.</p>
            {roster.length > 0 && (
              <ul className="accounts card">
                {roster.map((m) => <MemberRow key={`${m.id}-${m.name}`} member={m} />)}
              </ul>
            )}
            <form className="card form" onSubmit={addMembers}>
              <label>
                Ajouter des joueurs, un nom par ligne
                <textarea rows={3} value={names} onChange={(e) => setNames(e.target.value)} placeholder={'Prénom N.\nPrénom N.'} />
              </label>
              <button className="button primary" disabled={saving}>Ajouter à l’effectif</button>
            </form>
          </section>
        )}

        <button className="button quiet danger-text" onClick={erase}><Icon name="trash" /> Supprimer l’équipe</button>
      </main>
    </>
  )
}
