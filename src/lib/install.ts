// Installation de l'application sur l'écran d'accueil.
import { useSyncExternalStore } from 'react'

/** Évènement de Chrome, Edge et Android : le navigateur sait installer l'application. */
interface InstallPrompt extends Event {
  prompt(): Promise<unknown>
  userChoice: Promise<unknown>
}

/**
 * Comment installer sur cet appareil : déjà fait, par un bouton, par le menu Partager d'iOS,
 * ou à la main par le menu du navigateur.
 */
export type InstallWay = 'installed' | 'button' | 'ios' | 'menu'

interface Device {
  /** L'application est ouverte depuis l'écran d'accueil, ou vient d'être installée. */
  installed: boolean
  /** Le navigateur a proposé l'installation. */
  prompt: boolean
  userAgent: string
  touchPoints: number
}

export function installWay({ installed, prompt, userAgent, touchPoints }: Device): InstallWay {
  if (installed) return 'installed'
  if (prompt) return 'button'
  // les iPad récents se présentent comme des Mac, mais sont tactiles
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1)
  return ios ? 'ios' : 'menu'
}

let deferred: InstallPrompt | null = null
let justInstalled = false
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((listener) => listener())

// le navigateur ne propose l'installation qu'une fois, au démarrage : on la garde pour plus tard
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPrompt
    justInstalled = false
    changed()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    justInstalled = true
    changed()
  })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const current = () =>
  installWay({
    installed:
      justInstalled ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true,
    prompt: deferred !== null,
    userAgent: navigator.userAgent,
    touchPoints: navigator.maxTouchPoints,
  })

/** Ouvre la fenêtre d'installation du navigateur. */
async function install() {
  const event = deferred
  if (!event) return
  // chaque proposition ne sert qu'une fois
  deferred = null
  await event.prompt()
  await event.userChoice
  changed()
}

export const useInstall = () => ({ way: useSyncExternalStore(subscribe, current), install })
