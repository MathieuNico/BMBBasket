# BMB Playbook

Application du Bégrolles le May Basket pour que les coachs préparent les entraînements et partagent les systèmes de jeu avec leurs joueurs. Pensée pour le téléphone. Elle sert à la préparation et à l'apprentissage, pas pendant les matchs.

## Pour les coachs

- **Systèmes** : dessin sur demi-terrain ou terrain entier (courses, dribbles, passes, écrans, tirs), temps par temps, avec une consigne par temps, des défenseurs optionnels et une lecture animée. Placements de départ en un geste. Chaque système se publie pour une ou plusieurs équipes.
- **Entraînement**
  - *Séances* : équipe, date, thème, objectif, déroulé avec durées et horaires, matériel à prévoir, duplication. Une séance n'est visible des joueurs que si « Visible par les joueurs » est coché.
  - *Exercices* : bibliothèque classée par thème, avec fiche et dessin libre (joueurs, défenseurs, coachs, plots, plusieurs ballons).
  - *Effectif* : joueurs par équipe, présences.
- **Joueurs** : code du club à communiquer, équipes, liste des inscrits (changer d'équipe ou retirer un accès), aperçu de ce que voit chaque équipe.
- **Brouillon automatique** : un dessin non enregistré est repris si la page a été fermée.
- **Sauvegarde** : export et import dans un fichier.

## Pour les joueurs

Chaque joueur crée un compte, saisit le **code du club**, puis choisit son équipe. Il a ensuite accès, **en consultation seule** :

- aux séances publiées de son équipe, avec le déroulé et les exercices ;
- aux systèmes publiés pour son équipe, animés temps par temps.

Il ne voit ni les notes des coachs, ni les présences, ni l'effectif, ni les brouillons. Les consignes et descriptions publiées lui sont visibles. Seul un coach peut ensuite changer son équipe.

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

| Mode | Quand | Où sont les données | Accès joueurs |
| --- | --- | --- | --- |
| Sur cet appareil | par défaut, sans comptes | dans le navigateur de l'appareil | non (aperçu seulement) |
| Serveur du club | quand les variables Supabase sont renseignées : compte obligatoire | sur Supabase, partagées | oui |

Pour passer du premier au second sans rien perdre : **Réglages > Exporter** avant, puis **Importer** une fois connecté.

## Brancher le serveur (Supabase)

Sans serveur, il n'y a ni comptes ni partage : l'application s'ouvre directement.

1. Créer un compte et un projet sur https://supabase.com (offre gratuite, région Europe).
2. Créer la base, au choix :
   - **par GitHub** : dans **Project Settings > Integrations**, relier le dépôt, dossier de travail `.`, branche de production `main`, option **Deploy to production** activée. Les fichiers de `supabase/migrations` sont alors appliqués à chaque envoi sur `main` ;
   - **à la main** : dans **SQL Editor**, coller chaque fichier de `supabase/migrations`, dans l'ordre, et lancer.
3. **Authentication > Sign In / Providers** :
   - laisser **« Allow new users to sign up » activé** (les joueurs créent leur compte ; sans le code du club, un compte ne voit rien) ;
   - désactiver **« Confirm email »** : le service d'e-mails fourni par défaut est très limité et ne convient pas pour inscrire une équipe. Les adresses ne sont alors pas vérifiées. Pour les vérifier, garder l'option et configurer son propre serveur d'envoi (SMTP).
4. Désigner les coachs :
   - **Authentication > Users > Add user** : créer le compte du coach (case « Auto Confirm User » cochée). Si l'adresse existe déjà sans que vous l'ayez créée, supprimez ce compte avant de continuer.
   - puis, dans le **SQL Editor** :

   ```sql
   insert into public.staff (user_id, name)
   select id, 'Prénom' from auth.users where email = 'coach@exemple.fr';
   ```

5. Sur l'ordinateur : copier `.env.example` en `.env.local`, y mettre l'URL du projet et la clé **publique**, puis relancer `npm run dev`.
6. En ligne (Vercel) : ajouter les deux mêmes variables dans **Settings > Environment Variables**, puis redéployer.
7. Se connecter en coach : dans l'onglet **Joueurs**, ajouter les équipes puis envoyer le code du club.

Retirer un coach : `delete from public.staff where user_id = (select id from auth.users where email = 'coach@exemple.fr');`

Retirer un joueur : onglet **Joueurs**, croix à côté de son nom, puis changer le code du club pour l'empêcher de se réinscrire.

À savoir :

- Mot de passe oublié : l'application ne propose pas encore de réinitialisation. Le responsable intervient depuis Supabase (supprimer le compte pour que la personne le recrée).
- Comptes de mineurs : pour les moins de 15 ans, l'accord d'un parent est nécessaire. N'enregistrer que le prénom et l'initiale.
- Hors réseau, les contenus déjà chargés restent consultables ; les modifications demandent une connexion.
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
