# GOVERNANCE.md — Module de gouvernance Perform-Learn.fr

> **Usage** : Ce fichier est destiné à Claude Code.
> Il lui fournit le contexte métier, les fichiers de travail, les tâches à exécuter dans l'ordre, et les conventions à respecter.

---

## Contexte du projet

**Perform-Learn.fr** est un Digital Service Hub haut de gamme qui met en relation des consultants freelance (ERP, D365, etc.) avec des entreprises clientes, via une plateforme automatisée.

Ce module **gouvernance** est le système central de pilotage du projet. Il stocke et relie tous les artefacts de travail — de la vision stratégique jusqu'aux tâches opérationnelles — dans PostgreSQL, de façon à être exploitable aussi bien par un humain que par un agent IA.

### Les 3 niveaux du modèle

| Niveau | Horizon | Artefacts typiques |
|---|---|---|
| **Stratégique** | 6–18 mois | Vision, OKR, Epic, Roadmap cycle, Métrique Nord-Star, Test E2E |
| **Tactique** | Sprint / cycle | User Story, Plan d'action, Décision d'archi, Workflow, Test intégration |
| **Opérationnel** | Tâche / commit | Tâche atomique, Référence commit, Test unitaire, Bug, Décision de pivot |

Chaque artefact est lié à son parent (`parent_id`) : un Epic contient des User Stories, une User Story contient des Tâches. La table `execution_logs` trace toute action humaine ou agent — c'est le journal de reprise de contexte.

---

## Fichiers fournis

| Fichier | Rôle |
|---|---|
| `migration_governance_v1.sql` | Script de migration PostgreSQL complet (schéma, tables, index, triggers, vue, seed initial) |
| `GOVERNANCE.md` | Ce fichier — brief de setup pour Claude Code |

---

## Prérequis à vérifier avant de démarrer

- [ ] Accès SSH au VPS OVH opérationnel
- [ ] PostgreSQL installé et accessible (vérifier : `psql --version`)
- [ ] Base de données cible existante (ex: `performlearn`)
- [ ] Utilisateur PostgreSQL avec droits `CREATE SCHEMA` sur la base cible
- [ ] `psql` disponible en ligne de commande sur le VPS ou en local avec tunnel SSH

---

## Tâches — à exécuter dans l'ordre

### Étape 1 — Vérifier la connexion à la base

```bash
psql -U <db_user> -d <db_name> -c "\conninfo"
```

Résultat attendu : confirmation de connexion à la base cible. Si erreur, diagnostiquer avant de continuer.

---

### Étape 2 — Appliquer la migration

```bash
psql -U <db_user> -d <db_name> -f migration_governance_v1.sql
```

Vérifier l'absence d'erreurs dans la sortie. Les messages `CREATE TABLE`, `CREATE INDEX`, `INSERT`, `CREATE TRIGGER`, `CREATE VIEW` doivent tous apparaître sans `ERROR`.

---

### Étape 3 — Vérifier la structure créée

Exécuter ces requêtes de contrôle une par une :

```sql
-- Lister les tables du schéma
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'governance'
ORDER BY table_name;
```

Tables attendues : `artifact_types`, `artifacts`, `execution_logs`, `metrics`, `projects`, `users`

```sql
-- Vérifier le seed des types d'artefacts (17 lignes attendues)
SELECT level, COUNT(*) as nb
FROM governance.artifact_types
GROUP BY level
ORDER BY level;
```

```sql
-- Vérifier le seed utilisateurs et projet
SELECT actor_type, name, role FROM governance.users;
SELECT slug, name, status FROM governance.projects;
```

```sql
-- Vérifier la vue
SELECT * FROM governance.v_artifact_context LIMIT 0;
```

---

### Étape 4 — Seed de la roadmap Perform-Learn

Insérer les artefacts stratégiques de la roadmap dans la table `artifacts`. Utiliser `project_id = '10000000-0000-0000-0000-000000000001'` et `created_by = '00000000-0000-0000-0000-000000000001'` (Abdel, définis dans le seed initial).

Ordre d'insertion obligatoire : les parents avant les enfants (contrainte `parent_id`).

**Structure attendue :**

```
vision (1)
└── roadmap_cycle : Cycle 0 — Validation
└── roadmap_cycle : Cycle 1 — Infra & Waitlist
└── roadmap_cycle : Cycle 2 — Portail + Autorité LPA  ← cycle courant
    └── epic : Portail App Store
        └── user_story : Page catalogue apps
        └── user_story : Auth magic link
        └── user_story : Page Le Labo (LPA)
    └── epic : Dashboard Sommet v1
        └── user_story : Choix photo montagne
        └── user_story : Tâches statiques + barre progression
    └── epic : Marketing Phase B
        └── user_story : Papiers LPA #1 et #2
        └── user_story : Posts LinkedIn #4 et #5
        └── user_story : Email waitlist Brevo
└── roadmap_cycle : Cycle 3 — Première app métier
└── roadmap_cycle : Cycle 4 — Lancement public
└── roadmap_cycle : Cycle 5 — Croissance
└── roadmap_cycle : Cycle 6 — Monétisation
```

Pour chaque artefact, renseigner a minima :
- `title` : nom explicite
- `type_slug` : depuis `governance.artifact_types`
- `status` : `done` pour Cycles 0 et 1, `in_progress` pour Cycle 2, `draft` pour les suivants
- `description` : résumé en 1–2 phrases
- `sort_order` : ordre d'affichage (0, 10, 20...)

---

### Étape 5 — Seed des métriques Nord-Star

Pour chaque `roadmap_cycle`, insérer les métriques associées dans `governance.metrics`.

Exemple pour le Cycle 2 :

| name | target | unit | status |
|---|---|---|---|
| Utilisateurs connectés | 20 | utilisateurs | pending |
| Temps moyen sur portail | 120 | secondes | pending |
| Vues articles LPA | 500 | vues/article | pending |
| Nouvelles inscriptions | 30 | inscrits | pending |

---

### Étape 6 — Vérification finale via la vue

```sql
SELECT
    level,
    type_label,
    title,
    status,
    assignee_name,
    metric_count,
    last_action
FROM governance.v_artifact_context
ORDER BY level, type_label, title;
```

Résultat attendu : tous les artefacts insérés apparaissent avec leur niveau, type et statut.

---

### Étape 7 — Test du journal d'exécution (optionnel mais recommandé)

Insérer un log de test pour valider la traçabilité :

```sql
INSERT INTO governance.execution_logs
    (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES (
    (SELECT id FROM governance.artifacts WHERE title = 'Cycle 2 — Portail + Autorité LPA'),
    '00000000-0000-0000-0000-000000000002',  -- Claude Agent
    'agent',
    'status_changed',
    '{"status": "in_progress"}',
    'Setup initial du module gouvernance — migration v1 appliquée.'
);
```

Vérifier :

```sql
SELECT el.action, el.actor_type, u.name, el.note, el.logged_at
FROM governance.execution_logs el
LEFT JOIN governance.users u ON u.id = el.actor_id
ORDER BY el.logged_at DESC
LIMIT 5;
```

---

## Conventions à respecter

### Nommage
- Schéma : `governance` — ne jamais mélanger avec d'autres schémas du VPS (`store`, `shared`, etc.)
- UUID générés automatiquement via `gen_random_uuid()` — ne jamais forcer des IDs sauf pour le seed initial
- Slugs en `snake_case` minuscules — ex: `user_story`, `roadmap_cycle`
- Titres d'artefacts : lisibles, pas de codes techniques — ex: `"Cycle 2 — Portail + Autorité LPA"` et non `"C2"`

### Statuts valides pour `artifacts.status`
`draft` → `ready` → `in_progress` → `done` | `cancelled` | `blocked`

### Priorités (`artifacts.priority`)
- `1` = critique
- `2` = haute (défaut)
- `3` = normale
- `4` = basse

### Champ `metadata` (JSONB)
Libre, mais conventions suggérées :

```json
{
  "linkedin_post_url": "https://...",
  "github_branch": "feat/portail-v1",
  "vercel_url": "https://...",
  "sprint": "S3-avril-2026",
  "lean_hypothesis": "Si on lance le portail, alors 20+ utilisateurs s'inscrivent"
}
```

### `execution_logs.action` — valeurs normalisées
`created` | `status_changed` | `assigned` | `commented` | `test_run` | `metric_updated` | `pivot` | `escalated` | `onboarding_step`

---

## Lecture de contexte pour un agent IA

Pour qu'un agent reprenne le travail là où il s'est arrêté, la requête standard est :

```sql
-- Contexte complet d'un artefact et de ses enfants directs
SELECT * FROM governance.v_artifact_context
WHERE project_slug = 'perform-learn'
  AND status IN ('in_progress', 'ready', 'blocked')
ORDER BY level, sort_order;

-- Dernières actions (les 20 dernières)
SELECT el.action, el.actor_type, u.name, el.note, el.new_value, el.logged_at
FROM governance.execution_logs el
LEFT JOIN governance.users u ON u.id = el.actor_id
ORDER BY el.logged_at DESC
LIMIT 20;
```

Ces deux requêtes constituent le **contexte minimal d'onboarding agent**. Elles doivent être les premières exécutées à chaque nouvelle session de travail automatisé.

---

## Points de vigilance

- **Contrainte `parent_id`** : toujours insérer les parents avant les enfants. En cas de chargement en masse, désactiver temporairement avec `SET session_replication_role = replica;` puis réactiver.
- **La vue `v_artifact_context` est en lecture seule** — toutes les écritures passent par les tables directement.
- **Ne pas modifier `artifact_types`** sans mettre à jour les artefacts existants qui référencent le slug.
- **Backups** : avant toute migration complémentaire, faire un `pg_dump` du schéma `governance`.

```bash
pg_dump -U <db_user> -d <db_name> -n governance -f backup_governance_$(date +%Y%m%d).sql
```

---

## Résultat attendu en fin de setup

- [ ] Schéma `governance` créé avec 6 tables opérationnelles
- [ ] 17 types d'artefacts seedés
- [ ] 1 projet (`perform-learn`) et 2 acteurs (Abdel + Claude Agent) seedés
- [ ] Artefacts de la roadmap Perform-Learn insérés (vision → cycles → epics → stories)
- [ ] Métriques Nord-Star insérées pour le Cycle 2
- [ ] Vue `v_artifact_context` fonctionnelle
- [ ] Premier log d'exécution tracé
- [ ] Requêtes d'onboarding agent validées
