import { useState } from 'react'
import { Thumbnail } from '../components/Diagram'
import { PendingDraft } from '../components/DraftNotice'
import { Icon } from '../components/Icon'
import { byName, Chips, Header, normalize, useFeedback } from '../components/ui'
import { useStore } from '../data/store'
import { draftKey } from '../lib/drafts'
import { playScene } from '../lib/engine'
import { examplePlays } from '../lib/examples'

export function PlaysPage() {
  const { plays, save } = useStore()
  const { toast } = useFeedback()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const categories = [...new Set(plays.map((p) => p.category))].sort()
  const active = categories.includes(category) ? category : ''
  const shown = plays
    .filter((p) => !active || p.category === active)
    .filter((p) => normalize(`${p.name} ${p.description}`).includes(normalize(search.trim())))
    .sort(byName)

  const addExamples = async () => {
    try {
      for (const play of examplePlays()) await save('plays', play)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <>
      <Header title="Systèmes" />
      <main>
        <PendingDraft table="plays" draftKey={draftKey('plays')} href="/systemes/nouveau" />
        {plays.length === 0 ? (
          <div className="empty">
            <h2>Ton playbook est vide</h2>
            <p>Dessine ton premier système sur le terrain, ou pars de deux exemples.</p>
            <a className="button primary" href="#/systemes/nouveau">Créer un système</a>
            <button className="button ghost" onClick={addExamples}>Ajouter les exemples</button>
          </div>
        ) : (
          <>
            <input type="search" placeholder="Rechercher un système" value={search} onChange={(e) => setSearch(e.target.value)} />
            {categories.length > 1 && <Chips options={categories} value={active} onChange={setCategory} />}
            <ul className="grid">
              {shown.map((play) => (
                <li key={play.id}>
                  <a className="card play-card" href={`#/systemes/${play.id}`}>
                    <Thumbnail scene={playScene(play)} defense={play.defense} />
                    <strong>{play.name}</strong>
                    <span>{play.category} · {play.steps.length} temps</span>
                    {play.teams?.length ? <span className="shared">Partagé : {play.teams.join(', ')}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
            {shown.length === 0 && <p className="muted center">Aucun système ne correspond.</p>}
            <a className="fab" href="#/systemes/nouveau">
              <Icon name="plus" /> Système
            </a>
          </>
        )}
      </main>
    </>
  )
}
