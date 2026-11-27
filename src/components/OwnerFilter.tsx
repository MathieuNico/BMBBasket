import { useState } from 'react'
import { useStore } from '../data/store'
import { coachName, type Owned } from '../lib/owners'
import { Icon } from './Icon'

type Section = 'plays' | 'drills' | 'sessions'

// le choix est conservé quand on ouvre un élément puis qu'on revient à la liste
const remembered = new Map<Section, string>()

/** Affiche les contenus d'un coach dans toutes les listes. */
export function showCoach(id: string) {
  for (const section of ['plays', 'drills', 'sessions'] as const) remembered.set(section, id)
}

/** Filtre « Les miens / un autre coach / Tous » d'une liste. N'apparaît qu'à partir de deux coachs. */
export function useOwnerFilter<T extends Owned>(section: Section, items: T[]) {
  const { me, coaches, isMine } = useStore()
  const [value, setValue] = useState(() => remembered.get(section) ?? 'mine')
  const others = coaches.filter((c) => c.id !== me)
  const active = value === 'all' || others.some((c) => c.id === value) ? value : 'mine'
  const matching = (choice: string) =>
    items.filter((item) => (choice === 'all' ? true : choice === 'mine' ? isMine(item) : item.ownerId === choice))

  const choices = [
    { id: 'mine', label: 'Les miens' },
    ...others.map((c) => ({ id: c.id, label: coachName(c) })).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    { id: 'all', label: 'Tous' },
  ]

  const filter = others.length > 0 && (
    <div className="owners" role="group" aria-label="Afficher les contenus de">
      {choices.map((choice) => (
        <button
          key={choice.id}
          className={choice.id === active ? 'active' : ''}
          aria-pressed={choice.id === active}
          onClick={() => {
            remembered.set(section, choice.id)
            setValue(choice.id)
          }}
        >
          {choice.label}
          <small>{matching(choice.id).length}</small>
        </button>
      ))}
    </div>
  )

  return { visible: others.length ? matching(active) : items, active: others.length ? active : 'all', filter }
}

export function AuthorBadge({ item }: { item: Owned }) {
  const author = useStore().authorOf(item)
  return author ? (
    <span className="badge author">
      <Icon name="users" /> {author}
    </span>
  ) : null
}

/** Bandeau d'un contenu qu'on peut regarder mais pas modifier. */
export function ReadOnlyNotice({ author, copyLabel, onCopy }: { author?: string; copyLabel: string; onCopy(): void }) {
  return (
    <div className="readonly" role="note">
      <span className="tile-icon"><Icon name="eye" /></span>
      <p>
        <strong>Créé par {author}</strong>
        <small>Consultation seule. Copie-le pour l’adapter.</small>
      </p>
      <button className="button primary small" onClick={onCopy}>
        <Icon name="copy" /> {copyLabel}
      </button>
    </div>
  )
}
