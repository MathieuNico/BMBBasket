import { useState } from 'react'
import { Thumbnail } from '../../components/Diagram'
import { PendingDraft } from '../../components/DraftNotice'
import { Icon } from '../../components/Icon'
import { byName, Chips, normalize } from '../../components/ui'
import { useStore } from '../../data/store'
import { draftKey } from '../../lib/drafts'
import { THEMES } from '../../lib/types'
import { TrainingHeader } from './TrainingHeader'

export function DrillsPage() {
  const { drills } = useStore()
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState('')

  const themes = THEMES.filter((t) => drills.some((d) => d.theme === t))
  const active = themes.some((t) => t === theme) ? theme : ''
  const shown = drills
    .filter((d) => !active || d.theme === active)
    .filter((d) => normalize(`${d.name} ${d.description}`).includes(normalize(search.trim())))
    .sort(byName)

  return (
    <>
      <TrainingHeader current="Exercices" />
      <main>
        <PendingDraft table="drills" draftKey={draftKey('drills')} href="/entrainement/exercice/nouveau" />
        {drills.length === 0 ? (
          <div className="empty">
            <h2>Ta bibliothèque est vide</h2>
            <p>Crée un exercice une fois, réutilise-le dans toutes tes séances.</p>
            <a className="button primary" href="#/entrainement/exercice/nouveau">Créer un exercice</a>
          </div>
        ) : (
          <>
            <input type="search" placeholder="Rechercher un exercice" value={search} onChange={(e) => setSearch(e.target.value)} />
            {themes.length > 1 && <Chips options={[...themes]} value={active} onChange={setTheme} />}
            <ul className="grid">
              {shown.map((drill) => (
                <li key={drill.id}>
                  <a className="card play-card" href={`#/entrainement/exercice/${drill.id}`}>
                    <Thumbnail scene={drill} />
                    <strong>{drill.name}</strong>
                    <span>{drill.theme} · {drill.duration} min</span>
                  </a>
                </li>
              ))}
            </ul>
            {shown.length === 0 && <p className="muted center">Aucun exercice ne correspond.</p>}
            <a className="fab" href="#/entrainement/exercice/nouveau">
              <Icon name="plus" /> Exercice
            </a>
          </>
        )}
      </main>
    </>
  )
}
