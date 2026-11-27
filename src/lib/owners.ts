/** Chaque système, exercice et séance appartient à son auteur. La base applique les mêmes règles. */
export interface Coach {
  id: string
  name: string
}

export interface Owned {
  ownerId?: string
}

/** Contenus qui ont un auteur. Le reste (équipes, effectif) est commun aux coachs. */
export const OWNED_TABLES = ['plays', 'drills', 'sessions'] as const

/** `me` est absent sans serveur : tout est alors à la personne qui utilise l'appareil. */
export const isMine = (item: Owned, me?: string) => !me || !item.ownerId || item.ownerId === me

/** Seul l'auteur modifie. Le contenu d'une personne qui n'est plus coach reste modifiable. */
export const canEdit = (item: Owned, me: string | undefined, coaches: Coach[]) =>
  isMine(item, me) || !coaches.some((c) => c.id === item.ownerId)

export const coachName = (coach: Coach) => coach.name.trim() || 'Coach sans nom'

/** Nom donné par défaut à l'installation : on invite le coach à choisir le sien. */
export const needsName = (coach: Coach | undefined) => !!coach && ['', 'coach'].includes(coach.name.trim().toLowerCase())
