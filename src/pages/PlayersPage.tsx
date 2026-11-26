import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { byName, Header, useFeedback } from '../components/ui'
import { isCloud, useStore } from '../data/store'
import { useClub, type Account } from '../data/useClub'
import { uid } from '../lib/engine'
import { playerContent, showCode } from '../lib/sharing'
import { sameTeam } from '../lib/training'
import { TEAMS, type Team } from '../lib/types'

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

type Club = ReturnType<typeof useClub>

/** Lance une action et affiche son éventuelle erreur. */
function useAction() {
  const { toast } = useFeedback()
  return async (task: () => Promise<unknown>) => {
    try {
      await task()
    } catch (e) {
      toast((e as Error).message)
    }
  }
}

function ClubCode({ club }: { club: Club }) {
  const { confirm, toast } = useFeedback()
  const run = useAction()
  const invitation = `Inscris-toi sur ${location.origin}${location.pathname} avec le code club ${showCode(club.code)}`

  const send = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'BMB Playbook', text: invitation })
      else {
        await navigator.clipboard.writeText(invitation)
        toast('Invitation copiée')
      }
    } catch (e) {
      // fermer la fenêtre de partage n'est pas une erreur
      if ((e as Error).name !== 'AbortError') toast(`Partage impossible. Code à donner : ${showCode(club.code)}`)
    }
  }

  const change = async () => {
    if (!(await confirm('Changer le code du club ? L’ancien ne permettra plus de s’inscrire. Les comptes déjà inscrits gardent leur accès.', 'Changer'))) return
    run(club.changeCode)
  }

  return (
    <section className="card">
      <h2>Code du club</h2>
      <p className="code">{showCode(club.code)}</p>
      <p className="muted">Chaque joueur crée son compte puis saisit ce code.</p>
      <div className="row actions">
        <button className="button primary small" onClick={send}><Icon name="share" /> Inviter</button>
        <button className="button ghost small" onClick={change}>Changer le code</button>
      </div>
    </section>
  )
}

function AccountRow({ account, teams, club }: { account: Account; teams: Team[]; club: Club }) {
  const { confirm } = useFeedback()
  const run = useAction()
  const known = teams.some((t) => t.name === account.team)

  const expel = async () => {
    if (!(await confirm(`Retirer l’accès de ${account.name} ? Pour empêcher une réinscription, change aussi le code du club.`, 'Retirer'))) return
    run(() => club.expel(account.user_id))
  }

  return (
    <li className="account">
      <span>
        <strong>{account.name}</strong>
        <small>{account.email}</small>
      </span>
      <select value={account.team} aria-label={`Équipe de ${account.name}`} onChange={(e) => run(() => club.move(account.user_id, e.target.value))}>
        {!known && <option>{account.team}</option>}
        {teams.map((t) => <option key={t.id}>{t.name}</option>)}
      </select>
      <button className="icon-button" aria-label={`Retirer l’accès de ${account.name}`} onClick={expel}><Icon name="close" /></button>
    </li>
  )
}

function TeamCard({ team, club }: { team: Team; club: Club }) {
  const store = useStore()
  const { confirm } = useFeedback()
  const run = useAction()
  const content = playerContent(store, team.name)
  const accounts = club.accounts.filter((a) => sameTeam(a.team, team.name)).sort(byName)

  const erase = async () => {
    const warning = accounts.length ? ` Ses ${plural(accounts.length, 'joueur')} inscrit${accounts.length > 1 ? 's' : ''} ne verront plus rien : change-les d’équipe d’abord.` : ''
    if (!(await confirm(`Supprimer l’équipe ${team.name} ?${warning} Les systèmes et séances sont conservés.`, 'Supprimer'))) return
    run(() => store.remove('teams', team.id))
  }

  return (
    <li className="card">
      <h2>{team.name}</h2>
      <p className="muted">
        Partagé : {plural(content.plays.length, 'système')} · {plural(content.sessions.length, 'séance')}
      </p>
      {isCloud &&
        (accounts.length ? (
          <ul className="accounts">
            {accounts.map((a) => <AccountRow key={a.user_id} account={a} teams={store.teams} club={club} />)}
          </ul>
        ) : (
          <p className="muted">Aucun joueur inscrit.</p>
        ))}
      <div className="row actions">
        <a className="button ghost small" href={`#/apercu/${team.id}`}>Aperçu joueur</a>
        <button className="button ghost small danger-text" onClick={erase}>Supprimer</button>
      </div>
    </li>
  )
}

export function PlayersPage() {
  const { teams, members, sessions, save } = useStore()
  const { toast } = useFeedback()
  const club = useClub()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const exists = (team: string) => teams.some((t) => sameTeam(t.name, team))
  // les équipes déjà utilisées sont proposées en premier
  const suggestions = [...new Set([...members.map((m) => m.team), ...sessions.map((s) => s.team), ...TEAMS])].filter((t) => !exists(t))
  const orphans = club.accounts.filter((a) => !exists(a.team))

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const team = name.trim()
    if (!team) return toast('Indique l’équipe.')
    if (exists(team)) return toast('Cette équipe existe déjà.')
    setSaving(true)
    try {
      await save('teams', { id: uid(), name: team, updatedAt: '' })
      setName('')
    } catch (error) {
      toast((error as Error).message)
    }
    setSaving(false)
  }

  return (
    <>
      <Header title="Joueurs" />
      <main>
        {!isCloud && (
          <p className="warning-box" role="note">
            Les joueurs ne peuvent pas encore créer de compte : le serveur du club n’est pas branché. « Aperçu joueur »
            montre ce qu’ils verront.
          </p>
        )}
        {club.error && <p className="warning-box" role="alert">{club.error}</p>}
        {club.code && <ClubCode club={club} />}
        <p className="muted">Les joueurs consultent uniquement ce que tu publies pour leur équipe, sans pouvoir rien modifier.</p>
        <ul className="list">
          {[...teams].sort(byName).map((t) => <TeamCard key={t.id} team={t} club={club} />)}
        </ul>
        {orphans.length > 0 && (
          <section className="card">
            <h2>Sans équipe</h2>
            <ul className="accounts">
              {orphans.map((a) => <AccountRow key={a.user_id} account={a} teams={teams} club={club} />)}
            </ul>
          </section>
        )}
        <form className="card form" onSubmit={add}>
          <h2>Ajouter une équipe</h2>
          <label>
            Équipe
            <input list="new-teams" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : U15F" maxLength={30} />
            <datalist id="new-teams">{suggestions.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <button className="button primary" disabled={saving}>Ajouter</button>
        </form>
      </main>
    </>
  )
}
