import { useState } from 'react'
import { PendingDraft } from '../components/DraftNotice'
import { Icon } from '../components/Icon'
import { PlayCard } from '../components/PlayCard'
import { byName, Chips, EmptyState, Header, normalize, Search, useFeedback } from '../components/ui'
import { useStore } from '../data/store'
import { draftKey } from '../lib/drafts'
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
  const shared = plays.filter((p) => p.teams?.length).length

  const addExamples = async () => {
    try {
      for (const play of examplePlays()) await save('plays', play)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <>
      <Header
        title="Systèmes"
        subtitle={plays.length ? `${plays.length} au total · ${shared} partagé${shared > 1 ? 's' : ''}` : undefined}
      />
      <main>
        <PendingDraft table="plays" draftKey={draftKey('plays')} href="/systemes/nouveau" />
        {plays.length === 0 ? (
          <EmptyState icon="playbook" title="Ton playbook est vide" text="Dessine ton premier système sur le terrain, ou pars de deux exemples.">
            <a className="button primary" href="#/systemes/nouveau">Créer un système</a>
            <button className="button ghost" onClick={addExamples}>Ajouter les exemples</button>
          </EmptyState>
        ) : (
          <>
            <Search label="Rechercher un système" value={search} onChange={setSearch} />
            {categories.length > 1 && <Chips options={categories} value={active} onChange={setCategory} />}
            <ul className="grid">
              {shown.map((play) => (
                <li key={play.id}>
                  <PlayCard play={play} href={`/systemes/${play.id}`}>
                    <span className={play.teams?.length ? 'badge success' : 'badge'}>
                      {play.teams?.length ? play.teams.join(', ') : 'Privé'}
                    </span>
                  </PlayCard>
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
