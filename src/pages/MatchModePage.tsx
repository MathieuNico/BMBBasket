import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { PlayPlayer } from '../components/PlayPlayer'
import { useStore } from '../data/store'
import { playScene } from '../lib/engine'

/** Empêche l'écran de s'éteindre au bord du terrain (si le téléphone le permet). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    let done = false
    const request = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        lock = await navigator.wakeLock?.request('screen')
        if (done) lock?.release()
      } catch {
        // refusé (batterie faible, par exemple)
      }
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      done = true
      lock?.release()
      document.removeEventListener('visibilitychange', request)
    }
  }, [])
}

export function MatchModePage({ id }: { id: string }) {
  const { matches, plays } = useStore()
  const [current, setCurrent] = useState(0)
  useWakeLock()

  const match = matches.find((m) => m.id === id)
  const entries = (match?.plays ?? [])
    .flatMap((entry) => {
      const play = plays.find((p) => p.id === entry.playId)
      return play ? [{ entry, play }] : []
    })
    // les systèmes mis en évidence d'abord, dans l'ordre choisi
    .sort((a, b) => Number(b.entry.key) - Number(a.entry.key))
  const selected = entries[Math.min(current, entries.length - 1)]

  return (
    <div className="match-mode">
      <header className="header">
        <a className="icon-button" href={`#/matchs/${id}`} aria-label="Quitter le mode match"><Icon name="close" /></a>
        <h1>{match ? `vs ${match.opponent}` : 'Match introuvable'}</h1>
      </header>
      <nav className="chips" aria-label="Systèmes du match">
        {entries.map(({ entry, play }, i) => (
          <button key={play.id} className={`chip ${entry.key ? 'key' : ''} ${play.id === selected?.play.id ? 'active' : ''}`} onClick={() => setCurrent(i)}>
            {entry.key && <Icon name="star" filled />}
            {play.name}
          </button>
        ))}
      </nav>
      <main>
        {selected ? (
          <>
            {selected.entry.note && <p className="instruction">{selected.entry.note}</p>}
            <PlayPlayer key={selected.play.id} scene={playScene(selected.play)} defense={selected.play.defense} />
            {match?.notes && (
              <details className="card">
                <summary>Plan de match</summary>
                <p className="pre">{match.notes}</p>
              </details>
            )}
          </>
        ) : (
          <p className="muted center">Aucun système dans ce match.</p>
        )}
      </main>
    </div>
  )
}
