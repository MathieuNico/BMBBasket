# BMB Playbook

Application du Bégrolles le May Basket pour que les coachs préparent les entraînements et partagent les systèmes de jeu avec leurs joueurs. Pensée pour le téléphone. Elle sert à la préparation et à l'apprentissage, pas pendant les matchs.

## Pour les coachs

**Chacun ses contenus** (avec le serveur du club) : un système, un exercice ou une séance appartient au coach qui l'a créé.

| | L'auteur | Les autres coachs |
| --- | --- | --- |
| Consulter | oui | oui, avec le filtre au nom du coach |
| Modifier, supprimer, publier aux joueurs, pointer les présences | oui | non |
| Copier pour l'adapter | duplication | oui, la copie leur appartient |

Chaque coach choisit le nom que voient les autres dans **Réglages**. La règle est appliquée par la base, pas seulement par l'écran. Les équipes, l'effectif, les comptes joueurs et le code du club restent communs à tous les coachs.

- **Systèmes** : dessin sur demi-terrain ou terrain entier (courses, dribbles, passes, écrans, tirs), temps par temps, avec une consigne par temps, des défenseurs optionnels et une lecture animée. Placements de départ en un geste. Chaque système se publie pour une ou plusieurs équipes.
- **Entraînement**
  - *Séances* : équipe, date, thème, objectif, déroulé avec durées et horaires, matériel à prévoir, duplication. Une séance n'est visible des joueurs que si « Visible par les joueurs » est coché.
  - *Exercices* : bibliothèque classée par thème, avec fiche et dessin libre (joueurs, défenseurs, coachs, plots, plusieurs ballons).
- **Accueil** : prochaine séance, raccourcis, étapes pour démarrer.
- **Équipes** : code du club à communiquer et, par équipe, les comptes inscrits, l'effectif pour les présences et l'aperçu de ce que voient les joueurs.
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
   - **à la main** : dans **SQL Editor**, coller chaque fichier de `supabase/migrations`, dans l'ordre de leur nom, et lancer. Ne jamais relancer le premier fichier seul sur une base déjà à jour : il redonnerait à tous les coachs le droit de modifier les contenus des autres (si c'est arrivé, relancer ensuite les fichiers suivants).
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
7. Se connecter en coach : dans l'onglet **Équipes**, ajouter les équipes puis envoyer le code du club.

Retirer un coach : `delete from public.staff where user_id = (select id from auth.users where email = 'coach@exemple.fr');`. Ses systèmes, exercices et séances sont conservés, signés « un ancien coach », et les autres coachs peuvent alors les modifier ou les supprimer.

Retirer un joueur : onglet **Équipes**, croix à côté de son nom, puis changer le code du club pour l'empêcher de se réinscrire.

À savoir :

- Mot de passe oublié : l'application ne propose pas encore de réinitialisation. Le responsable intervient depuis Supabase (supprimer le compte pour que la personne le recrée).
- Comptes de mineurs : pour les moins de 15 ans, l'accord d'un parent est nécessaire. N'enregistrer que le prénom et l'initiale.
- Hors réseau, les contenus déjà chargés restent consultables ; les modifications demandent une connexion.
- Si un même contenu est modifié sur deux appareils en même temps, le dernier enregistrement l'emporte.
- Les contenus créés avant la règle « chacun ses contenus » sont attribués au dernier coach qui les a enregistrés, sinon au premier coach inscrit.
- Un projet Supabase gratuit peut être mis en pause après une période sans activité ; on le réactive depuis son tableau de bord.

## L'installer sur les téléphones

L'application doit être en ligne en HTTPS (par exemple Netlify, Vercel ou Cloudflare Pages) :

- commande de construction : `npm run build` ;
- dossier publié : `dist` ;
- variables d'environnement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

L'application est une PWA : elle s'installe depuis le site, sans passer par un magasin d'applications, s'ouvre en plein écran et reste consultable hors réseau. Sur le téléphone, ouvrir l'adresse, puis :

- **Android (Chrome)** : bouton **Installer** affiché dans l'application, ou menu ⋮ > **Installer l'application** ;
- **iPhone et iPad** : dans Safari, bouton **Partager** (parfois rangé dans le menu « … ») > **Sur l'écran d'accueil**. Se reconnecter à la première ouverture.

La proposition d'installation apparaît sur la page de connexion, à l'accueil des coachs et chez les joueurs ; les coachs la retrouvent aussi dans **Réglages**. Les nouvelles versions publiées s'installent toutes seules à l'ouverture.

## Logo du club

Déposer le logo en `public/logo.png` : il remplace l'écusson « BMB » par défaut. Les icônes de l'écran d'accueil sont dans `public/icons/` (régénérables avec `node scripts/make-icons.mjs`).
