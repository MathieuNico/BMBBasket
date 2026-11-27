import { useState } from 'react'
import { PendingDraft } from '../components/DraftNotice'
import { Icon } from '../components/Icon'
import { AuthorBadge, useOwnerFilter } from '../components/OwnerFilter'
import { PlayCard } from '../components/PlayCard'
import { byName, Chips, EmptyState, Header, normalize, Search, useFeedback } from '../components/ui'
import { useStore } from '../data/store'
import { draftKey } from '../lib/drafts'
import { examplePlays } from '../lib/examples'

export function PlaysPage() {
  const { plays, save, isMine } = useStore()
  const { toast } = useFeedback()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const owner = useOwnerFilter('plays', plays)

  const categories = [...new Set(owner.visible.map((p) => p.category))].sort()
  const active = categories.includes(category) ? category : ''
  const shown = owner.visible
    .filter((p) => !active || p.category === active)
    .filter((p) => normalize(`${p.name} ${p.description}`).includes(normalize(search.trim())))
    .sort(byName)
  const mine = plays.filter(isMine)
  const shared = mine.filter((p) => p.teams?.length).length

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
        subtitle={mine.length ? `${mine.length} à toi · ${shared} partagé${shared > 1 ? 's' : ''} aux joueurs` : undefined}
      />
      <main>
        <PendingDraft table="plays" draftKey={draftKey('plays')} href="/systemes/nouveau" />
        {owner.filter}
        {owner.visible.length === 0 ? (
          owner.active === 'mine' || owner.active === 'all' ? (
            <EmptyState icon="playbook" title="Pas encore de système" text="Dessine ton premier système sur le terrain, ou pars de deux exemples.">
              <a className="button primary" href="#/systemes/nouveau">Créer un système</a>
              <button className="button ghost" onClick={addExamples}>Ajouter les exemples</button>
            </EmptyState>
          ) : (
            <EmptyState icon="playbook" title="Rien pour le moment" text="Ce coach n’a pas encore créé de système." />
          )
        ) : (
          <>
            <Search label="Rechercher un système" value={search} onChange={setSearch} />
            {categories.length > 1 && <Chips options={categories} value={active} onChange={setCategory} />}
            <ul className="grid">
              {shown.map((play) => (
                <li key={play.id}>
                  <PlayCard play={play} href={`/systemes/${play.id}`}>
                    {isMine(play) ? (
                      <span className={play.teams?.length ? 'badge success' : 'badge'}>
                        {play.teams?.length ? play.teams.join(', ') : 'Non partagé'}
                      </span>
                    ) : (
                      <AuthorBadge item={play} />
                    )}
                  </PlayCard>
                </li>
              ))}
            </ul>
            {shown.length === 0 && <p className="muted center">Aucun système ne correspond.</p>}
          </>
        )}
        <a className="fab" href="#/systemes/nouveau">
          <Icon name="plus" /> Système
        </a>
      </main>
    </>
  )
}
