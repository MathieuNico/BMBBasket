import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Header, today, useFeedback } from '../components/ui'
import { supabase } from '../data/cloudRepo'
import { isCloud, useStore } from '../data/store'
import { parseBackup } from '../lib/backup'
import { TABLES, type Data } from '../lib/types'

function Account({ email }: { email: string }) {
  const { toast } = useFeedback()
  const [password, setPassword] = useState('')

  const change = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await supabase!.auth.updateUser({ password })
    if (error) return toast(`Mot de passe non modifié : ${error.message}`)
    setPassword('')
    toast('Mot de passe modifié')
  }

  return (
    <section className="card form">
      <h2>Mon compte</h2>
      <p>{email}</p>
      <form onSubmit={change}>
        <label>
          Nouveau mot de passe
          <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="button ghost">Changer le mot de passe</button>
      </form>
      <button className="button ghost danger-text" onClick={() => supabase!.auth.signOut({ scope: 'local' })}>Se déconnecter</button>
    </section>
  )
}

const summary = (data: Data) =>
  [
    `${data.plays.length} système(s)`,
    `${data.drills.length} exercice(s)`,
    `${data.sessions.length} séance(s)`,
    `${data.members.length} joueur(s)`,
  ].join(' · ')

export function SettingsPage({ email }: { email?: string }) {
  const store = useStore()
  const { confirm, toast } = useFeedback()
  const { plays, drills, sessions, members, teams } = store
  const data: Data = { plays, drills, sessions, members, teams }

  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `bmb-sauvegarde-${today()}.json` })
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const importData = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      const existing = new Set(TABLES.flatMap((t) => data[t].map((x) => x.id)))
      const replaced = TABLES.flatMap((t) => backup[t].filter((x) => existing.has(x.id))).length
      if (replaced && !(await confirm(`${replaced} élément(s) déjà présent(s) seront remplacés par ceux du fichier.`, 'Remplacer'))) return
      for (const table of TABLES) {
        for (const item of backup[table]) await store.save(table, item)
      }
      toast(`Importé : ${summary(backup)}`)
    } catch (error) {
      toast((error as Error).message)
    }
  }

  return (
    <>
      <Header title="Réglages" back="/accueil" />
      <main>
        {isCloud ? (
          <Account email={email ?? ''} />
        ) : (
          <section className="card">
            <h2>Mode sur cet appareil</h2>
            <p>
              Tes données sont enregistrées uniquement dans ce navigateur. Pour les partager entre coachs,
              et les montrer aux joueurs, il faut brancher le serveur du club (voir le fichier README).
            </p>
          </section>
        )}
        <section className="card form">
          <h2>Sauvegarde</h2>
          <p>{summary(data)}</p>
          <button className="button primary" onClick={exportData}>Exporter une sauvegarde</button>
          <label className="button ghost">
            Importer une sauvegarde
            <input type="file" accept="application/json,.json" onChange={importData} hidden />
          </label>
        </section>
      </main>
    </>
  )
}
