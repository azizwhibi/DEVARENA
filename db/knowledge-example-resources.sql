-- Paste into Supabase SQL Editor after knowledge-management.sql.
-- Four authored learning resources; no simulated bookmarks, progress or feedback.
-- Replay skips existing source identities and preserves reviewed edits.
begin;
with examples(external_source_id,title,description,resource_type,difficulty,technology_name,tags,content) as (
  values
    ('devarena-example-inner-join-v1',
     'Comprendre INNER JOIN',
     'Relier deux tables avec une clé commune et comprendre les lignes conservées par une jointure interne.',
     'tutorial',
     'beginner',
     'PostgreSQL',
     array['sql','jointures','bases de données']::text[],
     $lesson$Une jointure INNER JOIN combine les lignes de deux tables lorsque la condition de jointure est vraie. Une ligne sans correspondance n’apparaît pas dans le résultat.

Exemple pédagogique : une table clients contient id et nom ; une table commandes contient id, client_id et montant. Pour afficher chaque commande avec le nom de son client :

SELECT c.nom, co.id AS commande_id, co.montant
FROM clients AS c
INNER JOIN commandes AS co ON co.client_id = c.id;

Les alias c et co rendent les références aux colonnes plus courtes. La condition ON relie chaque commande à son client. Si un client a trois commandes, son nom apparaît sur trois lignes. Un client sans commande n’apparaît pas.

Pour filtrer les résultats, ajoutez une condition WHERE après la jointure :

WHERE co.montant >= 100;

Pour conserver aussi les clients sans commande, utilisez LEFT JOIN depuis clients. Les colonnes provenant de commandes seront alors NULL pour les clients sans correspondance.

À essayer dans une base d’exercice : créez deux clients, ajoutez deux commandes au premier et aucune au second, puis comparez INNER JOIN et LEFT JOIN. Ces noms de tables servent uniquement à l’exemple ; aucune table de votre application n’est créée ou modifiée par cette ressource.$lesson$),
    ('devarena-example-react-state-v1',
     'Gérer un état avec React',
     'Créer un compteur avec useState et mettre à jour sa valeur depuis un événement utilisateur.',
     'article',
     'beginner',
     'React',
     array['react','état','useState']::text[],
     $lesson$Un composant React peut conserver une valeur entre ses rendus avec le hook useState. Le hook renvoie la valeur actuelle et une fonction pour demander sa mise à jour.

Dans un composant interactif Next.js, utilisez une frontière client :

'use client';
import { useState } from 'react';

export default function Compteur() {
  const [compteur, setCompteur] = useState(0);

  return (
    <button onClick={() => setCompteur(valeur => valeur + 1)}>
      Compteur : {compteur}
    </button>
  );
}

Au premier rendu, compteur vaut 0. Le clic appelle setCompteur avec une fonction qui calcule la prochaine valeur à partir de la précédente. React programme alors un nouveau rendu.

Quand la prochaine valeur dépend de l’ancienne, cette forme fonctionnelle évite de dépendre d’une valeur capturée lors d’un rendu précédent. Ne modifiez pas directement une variable d’état en espérant que l’interface se mette à jour.

Appelez les hooks au niveau supérieur du composant : pas dans une boucle, une condition ou un gestionnaire de clic.

À essayer : ajoutez un bouton « Réinitialiser » qui appelle setCompteur(0). Le résultat de cet exercice est un apprentissage personnel ; il ne valide pas automatiquement un défi DevArena.$lesson$),
    ('devarena-example-async-await-v1',
     'Utiliser async/await',
     'Attendre une requête asynchrone et distinguer une erreur HTTP d’une réponse réussie.',
     'tutorial',
     'intermediate',
     'JavaScript',
     array['javascript','async-await','gestion des erreurs']::text[],
     $lesson$Une fonction déclarée async renvoie une promesse. Dans cette fonction, await attend le résultat d’une promesse sans bloquer le thread JavaScript pendant l’attente réseau.

Voici une fonction réutilisable qui charge des données JSON depuis une URL fournie par l’appelant :

async function chargerJson(url) {
  const reponse = await fetch(url);

  if (!reponse.ok) {
    throw new Error('Erreur HTTP : ' + reponse.status);
  }

  return await reponse.json();
}

Le code appelant peut gérer l’échec avec try/catch :

try {
  const donnees = await chargerJson(urlDeVotreApi);
  console.log(donnees);
} catch (erreur) {
  console.error('Chargement impossible', erreur);
}

Cet appel doit lui-même se trouver dans une fonction async ou dans un contexte prenant en charge await au niveau supérieur. urlDeVotreApi est une variable d’exercice, pas une route fournie par DevArena.

fetch ne rejette pas automatiquement sa promesse pour une réponse HTTP 404 ou 500. Le test reponse.ok est donc nécessaire pour traiter ces statuts comme des erreurs. Une réponse JSON mal formée peut aussi faire échouer reponse.json().

À essayer : testez une réponse réussie puis une réponse HTTP d’erreur dans votre environnement d’exercice. Dans une interface, affichez un état de chargement et une action de nouvelle tentative.$lesson$),
    ('devarena-example-git-branch-v1',
     'Créer une branche Git',
     'Isoler une modification dans une branche et vérifier son état avant de créer un commit.',
     'documentation',
     'beginner',
     null,
     array['git','branches','versionnement']::text[],
     $lesson$Une branche Git désigne une ligne de travail. Elle permet de préparer une modification sans déplacer directement la branche principale.

Dans un dépôt d’exercice, commencez par vérifier la branche et les fichiers modifiés :

git status
git branch --show-current

Créez une branche et placez-vous dessus :

git switch -c feature/ma-ressource

Effectuez ensuite une petite modification, puis examinez-la :

git diff
git status

Ajoutez uniquement les fichiers voulus à la zone de préparation, puis créez un commit :

git add chemin/du/fichier
git commit -m "Ajoute une ressource de formation"

Vérifiez les changements préparés avec git diff --staged avant le commit si nécessaire. Le commit enregistre les changements déjà préparés ; il ne publie pas automatiquement votre travail sur un serveur distant.

Pour revenir à une branche existante, utilisez git switch suivi de son nom. Si des modifications locales empêchent le changement de branche, examinez-les et conservez-les avant de continuer.

À essayer : créez une branche dans un dépôt de test, modifiez un fichier et observez git status avant et après le commit. Cette ressource ne lance aucune commande Git à votre place.$lesson$)
)
insert into public.knowledge_resources (
 title,description,resource_type,difficulty,technology_id,tags,content,
 external_url,estimated_minutes,status,source,external_source_id,attribution,created_by
)
select
 e.title,e.description,e.resource_type,e.difficulty,
 (select case when count(*)=1 then min(t.id::text)::uuid else null end
  from public.technologies t where t.name=e.technology_name and t.is_active=true),
 e.tags,e.content,null,null,'draft','devarena',e.external_source_id,
 'Contenu pédagogique original rédigé pour DevArena. Exemples de code destinés à l’apprentissage ; aucune activité utilisateur simulée.',null
from examples e
on conflict (source,external_source_id) where external_source_id is not null do nothing
returning id,title,status;
commit;
