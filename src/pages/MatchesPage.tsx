import { Icon } from '../components/Icon'
import { byDate, formatDate, Header } from '../components/ui'
import { useStore } from '../data/store'
import type { Match } from '../lib/types'

function MatchList({ title, matches }: { title: string; matches: Match[] }) {
  const { plays } = useStore()
  if (!matches.length) return null
  const count = (m: Match) => m.plays.filter((e) => plays.some((p) => p.id === e.playId)).length
  return (
    <section>
      <h2>{title}</h2>
      <ul className="list">
        {matches.map((m) => (
          <li key={m.id}>
            <a className="card match-card" href={`#/matchs/${m.id}`}>
              <span className="match-date">
                {formatDate(m.date)}{m.time && ` · ${m.time.replace(':', 'h')}`}
              </span>
              <strong>{m.team && `${m.team} · `}{m.opponent}</strong>
              <span>
                {m.home ? 'Domicile' : 'Extérieur'} · {count(m)} système{count(m) > 1 ? 's' : ''}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MatchesPage() {
  const { matches } = useStore()
  const { upcoming, past } = byDate(matches)

  return (
    <>
      <Header title="Matchs" />
      <main>
        {matches.length === 0 ? (
          <div className="empty">
            <h2>Aucun match prévu</h2>
            <p>Crée un match et choisis les systèmes à mettre en évidence.</p>
            <a className="button primary" href="#/matchs/nouveau">Préparer un match</a>
          </div>
        ) : (
          <>
            <MatchList title="À venir" matches={upcoming} />
            <MatchList title="Passés" matches={past} />
            <a className="fab" href="#/matchs/nouveau">
              <Icon name="plus" /> Match
            </a>
          </>
        )}
      </main>
    </>
  )
}
