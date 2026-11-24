# Portail d'Interventions — Gestion de Devis & Suivi Prestations

Application web full-stack permettant à des prestataires de services de chiffrer des devis, gérer leur catalogue de prestations et piloter l'avancement des interventions avec leurs clients.

---

## Fonctionnalités principales

- **Authentification & Contrôle d'accès par rôles (RBAC)** : inscription et connexion sécurisées par JWT (`PROVIDER`, `CLIENT`, `ADMIN`).
- **Cycle de vie automatisé des devis et interventions** :
  `DRAFT` $\rightarrow$ `SENT` $\rightarrow$ `ACCEPTED` / `REJECTED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`
- **Traçabilité complète** : chaque changement de statut est horodaté et associé à son auteur dans `StatusHistory`.
- **Catalogue de prestations** : gestion des tarifs unitaires HT, unités et taux de TVA par prestataire, réutilisables directement lors de la création d'un devis.
- **Tableaux de bord dédiés** : indicateurs clés (devis en attente, interventions actives, volume validé TTC) et filtres dynamiques par statut.

---

## Stack technique

| Couche | Technologies |
| :--- | :--- |
| **Backend** | NestJS, TypeScript, Prisma ORM, Passport JWT, `class-validator` |
| **Base de données** | PostgreSQL 16 (conteneurisé via Docker Compose) |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Axios, Lucide Icons |
| **DevOps & Qualité** | GitHub Actions (CI lint & build), ESLint |

---

## Architecture & Conception

Les diagrammes d'architecture et de conception sont disponibles dans le dossier `docs/` :
1. **Architecture globale** (`01-architecture-globale.drawio.png`)
2. **Modèle de données PostgreSQL / Prisma** (`02-modele-donnees.drawio.png`)
3. **Diagramme de séquence — Validation d'un devis** (`03-sequence-validation-devis.drawio.png`)
4. **Pipeline CI/CD GitHub Actions** (`04-pipeline-cicd.drawio.png`)

---

## Installation et démarrage en local

### Prérequis
- Node.js $\ge$ 20
- Docker & Docker Compose

### 1. Démarrer la base de données PostgreSQL
```bash
docker compose up -d

```

### 2. Configurer et lancer le Backend (`http://localhost:3000`)
```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```
*(Assurez-vous que `backend/.env` contient `DATABASE_URL` et `JWT_SECRET`.)*

### 3. Configurer et lancer le Frontend (`http://localhost:5173`)
```bash
cd frontend
npm install
npm run dev
```
---

## Principaux endpoints de l'API REST

| Méthode | Route | Rôle requis | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Création d'un compte (`CLIENT` ou `PROVIDER`) |
| `POST` | `/auth/login` | Public | Authentification et génération du token JWT |
| `GET` | `/auth/me` | Authentifié | Récupération du profil utilisateur courant |
| `GET` | `/quotes/clients` | `PROVIDER` | Liste des clients enregistrés |
| `POST` | `/quotes` | `PROVIDER` | Création d'un devis au statut `DRAFT` |
| `GET` | `/quotes` | Authentifié | Liste des devis visibles selon le rôle |
| `GET` | `/quotes/:id` | Authentifié | Détail d'un devis, lignes et historique des statuts |
| `PATCH` | `/quotes/:id/status` | Authentifié | Transition contrôlée du statut du devis |
| `DELETE` | `/quotes/:id` | `PROVIDER` | Suppression d'un devis au statut `DRAFT` |
| `GET` / `POST` | `/service-items` | `PROVIDER` | Consultation et ajout au catalogue de prestations |
| `PATCH` / `DELETE` | `/service-items/:id` | `PROVIDER` | Modification ou suppression d'une prestation |