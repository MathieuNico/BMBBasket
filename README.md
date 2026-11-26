# BMB Playbook

Application du Bégrolles le May Basket pour dessiner les systèmes de jeu et préparer les matchs, pensée pour le téléphone.

## Ce qu'elle fait

- **Systèmes** : dessin sur demi-terrain ou terrain entier (courses, dribbles, passes, écrans, tirs), temps par temps, avec une consigne par temps, des défenseurs optionnels et une lecture animée.
- **Entraînement**
  - *Séances* : équipe, date, thème, objectif, déroulé avec durées et horaires, temps libres, matériel à prévoir, duplication d'une séance.
  - *Exercices* : bibliothèque classée par thème, avec fiche (consignes, variantes, matériel) et dessin libre : joueurs, défenseurs, coachs, plots, plusieurs ballons.
  - *Effectif* : joueurs par équipe, pointage présent / absent / excusé et taux de présence.
- **Matchs** : adversaire, équipe, date, plan de match, choix et ordre des systèmes, mise en évidence par une étoile, consigne par système.
- **Mode match** : plein écran, systèmes étoilés en premier, écran maintenu allumé.
- **Sauvegarde** : export et import dans un fichier.

L'effectif contient des noms de joueurs, souvent mineurs : n'enregistrer que le nécessaire (prénom et initiale).

## La lancer sur l'ordinateur

```powershell
npm install
```

```powershell
npm run dev
```

Puis ouvrir http://localhost:5173. Autres commandes : `npm test` et `npm run build`.

## Les deux modes

| Mode | Quand | Où sont les données |
| --- | --- | --- |
| Sur cet appareil | par défaut | dans le navigateur de l'appareil |
| Coachs du club | quand `.env.local` est rempli | sur un serveur Supabase, partagées entre coachs |

Pour passer du premier au second sans rien perdre : **Réglages > Exporter** avant, puis **Importer** une fois connecté.

## Brancher les comptes coachs (Supabase)

1. Créer un compte et un projet sur https://supabase.com (offre gratuite, région Europe).
2. **SQL Editor** : coller le contenu de `supabase/schema.sql` et lancer (à relancer après une mise à jour de l'application qui modifie ce fichier).
3. **Authentication > Sign In / Providers** : désactiver les inscriptions libres (« Allow new users to sign up »).
4. **Authentication > Users > Add user** : créer chaque coach (e-mail + mot de passe provisoire, case « Auto Confirm User » cochée).
5. Autoriser ces coachs, dans le **SQL Editor** :

   ```sql
   insert into public.coaches (email, name) values
     ('coach@exemple.fr', 'Prénom');
   ```

6. Copier `.env.example` en `.env.local` et y mettre l'URL du projet et la clé **publique**.
7. Relancer `npm run dev`.

Retirer un coach : `delete from public.coaches where email = 'coach@exemple.fr';` puis supprimer son utilisateur.

À savoir :

- Hors réseau, les systèmes déjà chargés restent consultables ; les modifications demandent une connexion.
- Si deux coachs modifient le même système en même temps, le dernier enregistrement l'emporte.
- Un projet Supabase gratuit peut être mis en pause après une période sans activité ; on le réactive depuis son tableau de bord.

## L'installer sur les téléphones

L'application doit être en ligne en HTTPS (par exemple Netlify, Vercel ou Cloudflare Pages) :

- commande de construction : `npm run build` ;
- dossier publié : `dist` ;
- variables d'environnement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

Ensuite, sur le téléphone : ouvrir l'adresse, puis « Ajouter à l'écran d'accueil » (Safari : bouton Partager ; Chrome : menu ⋮).

## Logo du club

Déposer le logo en `public/logo.png` : il remplace l'écusson « BMB » par défaut. Les icônes de l'écran d'accueil sont dans `public/icons/` (régénérables avec `node scripts/make-icons.mjs`).
