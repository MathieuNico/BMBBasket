import { Header } from '../../components/ui'

const PARTS = [
  { path: '/entrainement', label: 'Séances' },
  { path: '/entrainement/exercices', label: 'Exercices' },
  { path: '/entrainement/effectif', label: 'Effectif' },
]

export function TrainingHeader({ current }: { current: 'Séances' | 'Exercices' | 'Effectif' }) {
  return (
    <>
      <Header title="Entraînement" />
      <nav className="subtabs" aria-label="Parties de l’entraînement">
        {PARTS.map((p) => (
          <a key={p.path} href={`#${p.path}`} className={p.label === current ? 'active' : ''}>
            {p.label}
          </a>
        ))}
      </nav>
    </>
  )
}
