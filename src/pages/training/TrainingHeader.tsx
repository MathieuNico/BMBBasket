import { Header } from '../../components/ui'

const PARTS = [
  { path: '/entrainement', label: 'Séances' },
  { path: '/entrainement/exercices', label: 'Exercices' },
]

export function TrainingHeader({ current }: { current: 'Séances' | 'Exercices' }) {
  return (
    <>
      <Header title="Entraînement" />
      <div className="switcher">
        <nav className="segmented" aria-label="Parties de l’entraînement">
          {PARTS.map((p) => (
            <a key={p.path} href={`#${p.path}`} className={p.label === current ? 'active' : ''}>
              {p.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  )
}
