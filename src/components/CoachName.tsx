import { useState, type FormEvent } from 'react'
import { useStore } from '../data/store'
import { needsName } from '../lib/owners'
import { useFeedback } from './ui'

/** Le nom que les autres coachs voient sur ce qu'on crée. */
export function CoachName() {
  const { me, coaches, rename } = useStore()
  const { toast } = useFeedback()
  const current = coaches.find((c) => c.id === me)
  const [name, setName] = useState(needsName(current) ? '' : (current?.name ?? ''))
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast('Écris ton prénom.')
    setSaving(true)
    try {
      await rename(name.trim())
      toast('Nom enregistré')
    } catch (error) {
      toast((error as Error).message)
    }
    setSaving(false)
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom" aria-label="Mon nom de coach" maxLength={30} />
      <button className="button primary" disabled={saving}>Enregistrer</button>
    </form>
  )
}
