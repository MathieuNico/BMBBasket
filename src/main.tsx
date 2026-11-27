import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/plus-jakarta-sans'
import { App } from './App'
import './styles.css'
import './animations.css'

registerSW({ immediate: true })
// sans cet écouteur, iPhone n'applique pas l'effet d'appui (:active) sous le doigt
document.addEventListener('touchstart', () => {}, { passive: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
