import { useState } from 'react'
import { Thumbnail } from '../../components/Diagram'
import { PendingDraft } from '../../components/DraftNotice'
import { Icon } from '../../components/Icon'
import { AuthorBadge, useOwnerFilter } from '../../components/OwnerFilter'
import { byName, Chips, EmptyState, normalize, Search } from '../../components/ui'
import { useStore } from '../../data/store'
import { draftKey } from '../../lib/drafts'
import { THEMES } from '../../lib/types'
import { TrainingHeader } from './TrainingHeader'

export function DrillsPage() {
  const { drills } = useStore()
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState('')
  const owner = useOwnerFilter('drills', drills)

  const themes = THEMES.filter((t) => owner.visible.some((d) => d.theme === t))
  const active = themes.some((t) => t === theme) ? theme : ''
  const shown = owner.visible
    .filter((d) => !active || d.theme === active)
    .filter((d) => normalize(`${d.name} ${d.description}`).includes(normalize(search.trim())))
    .sort(byName)

  return (
    <>
      <TrainingHeader current="Exercices" />
      <main>
        <PendingDraft table="drills" draftKey={draftKey('drills')} href="/entrainement/exercice/nouveau" />
        {owner.filter}
        {owner.visible.length === 0 ? (
          owner.active === 'mine' || owner.active === 'all' ? (
            <EmptyState icon="whistle" title="Pas encore d’exercice" text="Crée un exercice une fois, réutilise-le dans toutes tes séances.">
              <a className="button primary" href="#/entrainement/exercice/nouveau">Créer un exercice</a>
            </EmptyState>
          ) : (
            <EmptyState icon="whistle" title="Rien pour le moment" text="Ce coach n’a pas encore créé d’exercice." />
          )
        ) : (
          <>
            <Search label="Rechercher un exercice" value={search} onChange={setSearch} />
            {themes.length > 1 && <Chips options={[...themes]} value={active} onChange={setTheme} />}
            <ul className="grid">
              {shown.map((drill) => (
                <li key={drill.id}>
                  <a className="card play-card" href={`#/entrainement/exercice/${drill.id}`}>
                    <Thumbnail scene={drill} />
                    <strong>{drill.name}</strong>
                    <span>{drill.theme} · {drill.duration} min</span>
                    <AuthorBadge item={drill} />
                  </a>
                </li>
              ))}
            </ul>
            {shown.length === 0 && <p className="muted center">Aucun exercice ne correspond.</p>}
          </>
        )}
        <a className="fab" href="#/entrainement/exercice/nouveau">
          <Icon name="plus" /> Exercice
        </a>
      </main>
    </>
  )
}
