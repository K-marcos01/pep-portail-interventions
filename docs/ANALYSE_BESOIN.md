# Diagnostic, Analyse du Besoin & Cahier des Charges (MVP)

## 1. Contexte et enjeux métiers
Les travailleurs indépendants et très petites entreprises (artisans, consultants, prestataires techniques) gèrent fréquemment leurs demandes clients, leurs devis et le suivi de leurs interventions via des canaux dispersés (e-mails, appels, tableurs). Cette organisation génère trois difficultés majeures :
* **Perte de traçabilité :** Absence d'historique centralisé sur l'état d'avancement d'un dossier.
* **Délais de validation allongés :** Échanges lents autour des devis (impression, signature manuelle, renvoi).
* **Manque de visibilité client :** Sollicitations répétées du prestataire pour connaître l'état d'une intervention.

## 2. Personae (Profils utilisateurs anonymisés)
* **Persona 1 — Marc (Prestataire / Gérant TPE, 38 ans) :** Artisan indépendant réalisant 15 à 20 interventions par mois. Il a besoin de chiffrer rapidement ses prestations, de suivre l'état de ses chantiers depuis un tableau de bord unique et d'être alerté dès qu'un client valide un devis.
* **Persona 2 — Sophie (Cliente, 42 ans) :** Particulière ou responsable administrative sollicitant une intervention. Elle souhaite consulter son devis en ligne, le valider ou le refuser en un clic, télécharger le document PDF et suivre l'avancement de l'intervention sans avoir à relancer le prestataire.

## 3. User Stories priorisées (Backlog MVP)

| ID | Rôle | User Story | Priorité |
| :--- | :--- | :--- | :--- |
| **US-01** | Utilisateur | En tant qu'utilisateur (Prestataire ou Client), je veux me connecter de manière sécurisée afin d'accéder uniquement aux données correspondant à mon rôle. | Must Have |
| **US-02** | Prestataire | En tant que prestataire, je veux créer et gérer mon catalogue de prestations (libellé, unité, prix unitaire HT, TVA) afin d'accélérer la rédaction des devis. | Must Have |
| **US-03** | Prestataire | En tant que prestataire, je veux créer un devis rattaché à un client en sélectionnant des lignes de prestation afin de calculer automatiquement les montants HT/TTC. | Must Have |
| **US-04** | Prestataire | En tant que prestataire, je veux faire évoluer le statut d'un dossier (`Brouillon` → `Devis envoyé` → `Validé` → `En cours` → `Terminé`) afin de piloter mes interventions. | Must Have |
| **US-05** | Client | En tant que client, je veux consulter mes devis en ligne et les accepter ou les refuser afin de formaliser mon accord rapidement. | Must Have |
| **US-06** | Client / Prestataire | En tant qu'utilisateur, je veux télécharger un devis au format PDF généré dynamiquement afin de le conserver ou de le transmettre en comptabilité. | Should Have |
| **US-07** | Client / Prestataire | En tant qu'utilisateur, je veux recevoir une notification e-mail automatique lors de l'envoi ou de la validation d'un devis afin d'être informé en temps réel. | Should Have |
| **US-08** | Prestataire | En tant que prestataire, je veux visualiser des indicateurs clés sur mon tableau de bord (devis en attente, interventions en cours, chiffre d'affaires validé) afin de piloter mon activité. | Could Have |

## 4. Contraintes techniques et indicateurs de succès (KPI)
* **Sécurité & Confidentialité :** Authentification par JWT, hachage fort des mots de passe, contrôle d'accès strict par rôle (RBAC) et isolation des données par client (un client ne peut jamais consulter les dossiers d'un autre client).
* **Qualité logicielle :** Architecture modulaire TypeScript (NestJS / React), couverture de tests automatisés ≥ 75 % sur la logique métier critique, validation systématique via pipeline CI/CD.
* **Performance & Accessibilité :** Temps de réponse moyen de l'API < 200 ms, taux d'erreurs HTTP 5xx = 0 % en usage nominal, score Lighthouse ≥ 90 sur le portail client.
