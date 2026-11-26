import { readDraft } from '../lib/drafts'

/** Bandeau dans l'éditeur quand un brouillon vient d'être repris. */
export function RestoredNotice({ outdated, onDiscard }: { outdated: boolean; onDiscard(): void }) {
  return (
    <div className="draft-notice" role="status">
      <span>
        {outdated
          ? 'Brouillon repris, mais une version plus récente a été enregistrée : enregistrer la remplacera.'
          : 'Brouillon non enregistré repris.'}
      </span>
      <button className="button ghost small" onClick={onDiscard}>Abandonner</button>
    </div>
  )
}

/** Rappel, hors de l'éditeur, qu'un dessin attend d'être enregistré. */
export function PendingDraft({ table, draftKey, href }: { table: 'plays' | 'drills'; draftKey: string; href: string }) {
  const draft = readDraft(table, draftKey)
  if (!draft) return null
  return (
    <div className="draft-notice">
      <span>Dessin non enregistré{draft.value.name && ` : « ${draft.value.name} »`}</span>
      <a className="button primary small" href={`#${href}`}>Reprendre</a>
    </div>
  )
}
