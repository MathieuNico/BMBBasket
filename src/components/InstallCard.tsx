import { useState } from 'react'
import { useInstall } from '../lib/install'
import { Icon } from './Icon'

const HIDDEN = 'bmb.installation.masquee'

/**
 * Propose d'installer l'application sur le téléphone.
 * `permanent` : dans les réglages, toujours affichée. Ailleurs elle n'apparaît que si l'on
 * sait comment installer sur cet appareil, et se réduit à un petit bouton après « Plus tard ».
 */
export function InstallCard({ permanent }: { permanent?: boolean }) {
  const { way, install } = useInstall()
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDDEN) === 'oui')

  if (!permanent && (way === 'installed' || way === 'menu')) return null

  const hide = (next: boolean) => {
    if (next) localStorage.setItem(HIDDEN, 'oui')
    else localStorage.removeItem(HIDDEN)
    setHidden(next)
  }

  if (!permanent && hidden) {
    return (
      <button type="button" className="button quiet small" onClick={() => hide(false)}>
        <Icon name="install" /> Installer l’application
      </button>
    )
  }

  return (
    <section className="card stack install">
      <h2>{way === 'installed' ? 'Application installée' : 'Installer l’application'}</h2>
      {way === 'installed' ? (
        <p className="muted">Tu peux l’ouvrir depuis l’écran d’accueil de cet appareil.</p>
      ) : (
        <p className="muted">Une icône BMB sur ton écran d’accueil, et l’application s’ouvre en plein écran.</p>
      )}

      {way === 'button' && (
        <button type="button" className="button primary" onClick={install}>
          <Icon name="install" /> Installer
        </button>
      )}

      {way === 'ios' && (
        <>
          <ol className="steps">
            <li>Dans Safari, touche <b>Partager</b> <Icon name="shareIos" /> (parfois rangé dans le menu « … »).</li>
            <li>Choisis <b>Sur l’écran d’accueil</b>.</li>
            <li>Touche <b>Ajouter</b>, puis ouvre BMB depuis sa nouvelle icône.</li>
          </ol>
          <p className="muted">Lien ouvert depuis une messagerie ou un réseau social ? Ouvre-le d’abord dans Safari.</p>
        </>
      )}

      {way === 'menu' && (
        <p>
          Ouvre le menu du navigateur, puis choisis <b>Installer l’application</b> ou <b>Ajouter à l’écran d’accueil</b>.
        </p>
      )}

      {!permanent && (
        <button type="button" className="button quiet small" onClick={() => hide(true)}>Plus tard</button>
      )}
    </section>
  )
}
