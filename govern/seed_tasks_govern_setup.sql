-- ============================================================
-- Seed Tâches atomiques — Setup /govern (session scaffolding)
-- Epic parent : ep000000-gov0-0000-0000-000000000001
-- US parents  : us000000-gov0-0000-0000-000000000001..4
-- Acteur      : 00000000-0000-0000-0000-000000000002 (Claude Agent)
-- Date        : 2026-04-06
-- ============================================================

-- Prérequis : seed_epic_govern.sql déjà appliqué
-- Vérifier : SELECT id FROM governance.artifacts
--            WHERE id = 'ep000000-gov0-0000-0000-000000000001';

-- ============================================================
-- US 1 — Vue roadmap drill-down (cycles → epics → stories → tâches)
-- us000000-gov0-0000-0000-000000000001
-- ============================================================

INSERT INTO governance.artifacts
    (id, project_id, parent_id, type_slug, title, description,
     status, priority, assignee_id, sort_order, tags, metadata, created_by)
VALUES

-- T1 : Tailwind CSS
(
    'ta000000-gov0-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000001',
    'task',
    'Installer Tailwind CSS v4 + PostCSS dans le portail',
    'npm install -D tailwindcss @tailwindcss/postcss autoprefixer. Créer tailwind.config.ts et postcss.config.mjs. Ajouter directives @tailwind dans globals.css.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    10, ARRAY['tailwind', 'css', 'config'],
    '{"file": "postcss.config.mjs, tailwind.config.ts, app/globals.css", "commit": "scaffold /govern interface"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T2 : GovernSidebar + layout
(
    'ta000000-gov0-0000-0000-000000000102',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000001',
    'task',
    'Créer GovernSidebar.tsx et app/govern/layout.tsx',
    'Sidebar de navigation avec liens Roadmap / Artefacts / Agent / Logs. Layout flex min-h-screen avec sidebar + main.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    20, ARRAY['component', 'layout', 'navigation'],
    '{"file": "components/govern/GovernSidebar.tsx, app/govern/layout.tsx"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T3 : ArtifactCard + page roadmap
(
    'ta000000-gov0-0000-0000-000000000103',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000001',
    'task',
    'Créer ArtifactCard.tsx et app/govern/roadmap/page.tsx',
    'Server Component. Récupère getArtifactContext, filtre roadmap_cycle. ArtifactCard affiche badges niveau + statut + lien détail. export dynamic force-dynamic.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    30, ARRAY['component', 'roadmap', 'server-component'],
    '{"file": "components/govern/ArtifactCard.tsx, app/govern/roadmap/page.tsx"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T4 : Badges StatusBadge + LevelBadge
(
    'ta000000-gov0-0000-0000-000000000104',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000001',
    'task',
    'Créer StatusBadge.tsx et LevelBadge.tsx',
    'Composants badge colorés. StatusBadge : draft/ready/in_progress/done/cancelled/blocked. LevelBadge : strategic/tactical/operational. Classes Tailwind.',
    'done', 2, '00000000-0000-0000-0000-000000000002',
    40, ARRAY['component', 'badge', 'ui'],
    '{"file": "components/govern/StatusBadge.tsx, components/govern/LevelBadge.tsx"}',
    '00000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- US 2 — Détail artefact — édition statut, champs, tâches enfants
-- us000000-gov0-0000-0000-000000000002
-- ============================================================

INSERT INTO governance.artifacts
    (id, project_id, parent_id, type_slug, title, description,
     status, priority, assignee_id, sort_order, tags, metadata, created_by)
VALUES

-- T1 : Route API artifacts GET+POST
(
    'ta000000-gov0-0000-0000-000000000201',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000002',
    'task',
    'Créer app/govern/api/artifacts/route.ts (GET + POST)',
    'GET : liste filtrée via getArtifactContext, params project + status[]. POST : createArtifact + insertLog. Retourne 201 avec id.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    10, ARRAY['api', 'route', 'artifacts'],
    '{"file": "app/govern/api/artifacts/route.ts"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T2 : Route API artifacts/[id] GET+PATCH
(
    'ta000000-gov0-0000-0000-000000000202',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000002',
    'task',
    'Créer app/govern/api/artifacts/[id]/route.ts (GET + PATCH)',
    'GET : getArtifactById + getArtifactChildren. PATCH : updateArtifactStatus si status présent, update champs libres sinon. Log auto-inséré.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    20, ARRAY['api', 'route', 'patch'],
    '{"file": "app/govern/api/artifacts/[id]/route.ts"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T3 : Page détail artefact
(
    'ta000000-gov0-0000-0000-000000000203',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000002',
    'task',
    'Créer app/govern/artifacts/[id]/page.tsx',
    'Server Component. Charge artifact + children + metrics + logs en parallel. Affiche titre, badges, sous-artefacts, historique récent. export dynamic force-dynamic.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    30, ARRAY['page', 'detail', 'server-component'],
    '{"file": "app/govern/artifacts/[id]/page.tsx"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T4 : ArtifactForm + page liste artefacts
(
    'ta000000-gov0-0000-0000-000000000204',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000002',
    'task',
    'Créer ArtifactForm.tsx et app/govern/artifacts/page.tsx',
    'ArtifactForm : client component, select statut + note, PATCH via fetch. Page liste : filtres ?status= et ?type= côté serveur. export dynamic force-dynamic.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    40, ARRAY['component', 'form', 'artifacts'],
    '{"file": "components/govern/ArtifactForm.tsx, app/govern/artifacts/page.tsx"}',
    '00000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- US 3 — Vue agent — contexte onboarding + génération TASK.md
-- us000000-gov0-0000-0000-000000000003
-- ============================================================

INSERT INTO governance.artifacts
    (id, project_id, parent_id, type_slug, title, description,
     status, priority, assignee_id, sort_order, tags, metadata, created_by)
VALUES

-- T1 : Route agent/context GET+POST
(
    'ta000000-gov0-0000-0000-000000000301',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000003',
    'task',
    'Créer app/govern/api/agent/context/route.ts (GET + POST)',
    'GET : artefacts actifs (in_progress/ready/blocked) + 20 logs récents. POST : génère TASK.md markdown pour les artifact_ids fournis (assignés à l''agent).',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    10, ARRAY['api', 'agent', 'taskmd'],
    '{"file": "app/govern/api/agent/context/route.ts"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T2 : Page /govern/agent
(
    'ta000000-gov0-0000-0000-000000000302',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000003',
    'task',
    'Créer app/govern/agent/page.tsx',
    'Client component. Polling /govern/api/agent/context toutes les 30s. Bouton "Générer TASK.md" → POST → affiche TaskMdPreview. Bouton Terracotta #B9958D.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    20, ARRAY['page', 'agent', 'client-component'],
    '{"file": "app/govern/agent/page.tsx"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T3 : TaskMdPreview
(
    'ta000000-gov0-0000-0000-000000000303',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000003',
    'task',
    'Créer components/govern/TaskMdPreview.tsx',
    'Prévisualisation TASK.md généré. Bouton copier clipboard. Pre monospace, max-h-96 scrollable. Style sobre border-gray-200.',
    'done', 2, '00000000-0000-0000-0000-000000000002',
    30, ARRAY['component', 'preview', 'taskmd'],
    '{"file": "components/govern/TaskMdPreview.tsx"}',
    '00000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- US 4 — Feed audit trail — logs humain et agent en temps réel
-- us000000-gov0-0000-0000-000000000004
-- ============================================================

INSERT INTO governance.artifacts
    (id, project_id, parent_id, type_slug, title, description,
     status, priority, assignee_id, sort_order, tags, metadata, created_by)
VALUES

-- T1 : Route logs GET+POST
(
    'ta000000-gov0-0000-0000-000000000401',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000004',
    'task',
    'Créer app/govern/api/logs/route.ts (GET + POST)',
    'GET : getLogs avec filtre optionnel artifact_id et limit. POST : insertLog. Jointure governance.users pour actor_name.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    10, ARRAY['api', 'logs', 'audit'],
    '{"file": "app/govern/api/logs/route.ts"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T2 : Page logs
(
    'ta000000-gov0-0000-0000-000000000402',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000004',
    'task',
    'Créer app/govern/logs/page.tsx',
    'Server Component. getLogs(undefined, 100). Affichage via LogEntry. export dynamic force-dynamic.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    20, ARRAY['page', 'logs', 'audit'],
    '{"file": "app/govern/logs/page.tsx"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T3 : LogEntry + MetricRow
(
    'ta000000-gov0-0000-0000-000000000403',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000004',
    'task',
    'Créer LogEntry.tsx et MetricRow.tsx',
    'LogEntry : acteur + date localisée + action + note. MetricRow : nom KPI, badge statut, valeur actual/target, barre de progression calculée en %.',
    'done', 2, '00000000-0000-0000-0000-000000000002',
    30, ARRAY['component', 'log', 'metric'],
    '{"file": "components/govern/LogEntry.tsx, components/govern/MetricRow.tsx"}',
    '00000000-0000-0000-0000-000000000001'
),

-- T4 : Route metrics GET+PATCH
(
    'ta000000-gov0-0000-0000-000000000404',
    '10000000-0000-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000004',
    'task',
    'Créer app/govern/api/metrics/route.ts (GET + PATCH)',
    'GET : getMetrics par artifact_id. PATCH : met à jour actual, status, measured_at. Retourne { success: true }.',
    'done', 2, '00000000-0000-0000-0000-000000000002',
    40, ARRAY['api', 'metrics', 'kpi'],
    '{"file": "app/govern/api/metrics/route.ts"}',
    '00000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- TÂCHES TRANSVERSES (lib + config)
-- parent : Epic /govern
-- ============================================================

INSERT INTO governance.artifacts
    (id, project_id, parent_id, type_slug, title, description,
     status, priority, assignee_id, sort_order, tags, metadata, created_by)
VALUES

-- lib/govern/db.ts
(
    'ta000000-gov0-0000-0000-000000000501',
    '10000000-0000-0000-0000-000000000001',
    'ep000000-gov0-0000-0000-000000000001',
    'task',
    'Créer lib/govern/db.ts — connexion PostgreSQL VPS',
    'Pool pg (max 5, timeout 5s). Fonctions query<T> et queryOne<T>. SERVER ONLY — jamais importé côté client. DATABASE_URL via env.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    5, ARRAY['lib', 'db', 'postgresql'],
    '{"file": "lib/govern/db.ts"}',
    '00000000-0000-0000-0000-000000000001'
),

-- lib/govern/types.ts
(
    'ta000000-gov0-0000-0000-000000000502',
    '10000000-0000-0000-0000-000000000001',
    'ep000000-gov0-0000-0000-000000000001',
    'task',
    'Créer lib/govern/types.ts — types TypeScript BDD',
    'Interfaces Artifact, Metric, ExecutionLog, ArtifactType. Types ArtifactLevel, ArtifactStatus, ActorType, MetricStatus. Alignés sur le schéma governance PostgreSQL.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    6, ARRAY['lib', 'types', 'typescript'],
    '{"file": "lib/govern/types.ts"}',
    '00000000-0000-0000-0000-000000000001'
),

-- lib/govern/queries.ts
(
    'ta000000-gov0-0000-0000-000000000503',
    '10000000-0000-0000-0000-000000000001',
    'ep000000-gov0-0000-0000-000000000001',
    'task',
    'Créer lib/govern/queries.ts — requêtes SQL nommées',
    'getArtifactContext, getArtifactById, getArtifactChildren, getMetrics, getLogs, updateArtifactStatus, createArtifact, insertLog. Pas d''ORM, SQL brut via query/queryOne.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    7, ARRAY['lib', 'queries', 'sql'],
    '{"file": "lib/govern/queries.ts"}',
    '00000000-0000-0000-0000-000000000001'
),

-- .env.local + DATABASE_URL
(
    'ta000000-gov0-0000-0000-000000000504',
    '10000000-0000-0000-0000-000000000001',
    'ep000000-gov0-0000-0000-000000000001',
    'task',
    'Configurer DATABASE_URL dans .env.local',
    'Créer portal/.env.local avec DATABASE_URL=postgresql://appstore:PASSWORD@37.59.125.159:5432/appstore. Documenter dans .env.example. Ne pas committer .env.local.',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    8, ARRAY['config', 'env', 'security'],
    '{"file": "portal/.env.local, portal/.env.example"}',
    '00000000-0000-0000-0000-000000000001'
),

-- Build validation
(
    'ta000000-gov0-0000-0000-000000000505',
    '10000000-0000-0000-0000-000000000001',
    'ep000000-gov0-0000-0000-000000000001',
    'task',
    'Valider npm run build — 0 erreurs de compilation',
    'Build Next.js 14 sans erreurs. Toutes les pages /govern passent en ƒ (Dynamic). Correction postcss.config.mjs (tailwindcss v4 → @tailwindcss/postcss).',
    'done', 1, '00000000-0000-0000-0000-000000000002',
    9, ARRAY['build', 'ci', 'validation'],
    '{"result": "14 pages compilées, 0 erreurs TypeScript"}',
    '00000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- LOGS D'EXÉCUTION — traçabilité session scaffolding
-- ============================================================

INSERT INTO governance.execution_logs
    (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES

('ep000000-gov0-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000002', 'agent',
 'status_changed', '{"status": "in_progress"}',
 'Session scaffolding — 17 tâches créées, build Next.js validé (14 routes, 0 erreur)'),

('us000000-gov0-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000002', 'agent',
 'status_changed', '{"status": "done"}',
 'Roadmap page + ArtifactCard + StatusBadge + LevelBadge + GovernSidebar — build OK'),

('us000000-gov0-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000002', 'agent',
 'status_changed', '{"status": "done"}',
 'Routes API artifacts GET/POST/PATCH + ArtifactForm + page détail — build OK'),

('us000000-gov0-0000-0000-000000000003',
 '00000000-0000-0000-0000-000000000002', 'agent',
 'status_changed', '{"status": "done"}',
 'Route agent/context GET+POST + page agent polling + TaskMdPreview — build OK'),

('us000000-gov0-0000-0000-000000000004',
 '00000000-0000-0000-0000-000000000002', 'agent',
 'status_changed', '{"status": "done"}',
 'Route logs GET+POST + route metrics GET+PATCH + LogEntry + MetricRow + page logs — build OK');

-- Passer les US en done
UPDATE governance.artifacts
SET status = 'done', updated_at = NOW()
WHERE id IN (
    'us000000-gov0-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000002',
    'us000000-gov0-0000-0000-000000000003',
    'us000000-gov0-0000-0000-000000000004'
);

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================

SELECT at.level, a.type_slug, a.title, a.status
FROM governance.artifacts a
JOIN governance.artifact_types at ON at.slug = a.type_slug
WHERE a.parent_id IN (
    'ep000000-gov0-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000002',
    'us000000-gov0-0000-0000-000000000003',
    'us000000-gov0-0000-0000-000000000004'
)
ORDER BY at.level DESC, a.parent_id, a.sort_order;

SELECT a.title, a.status,
       (SELECT COUNT(*) FROM governance.artifacts c WHERE c.parent_id = a.id) AS nb_tasks
FROM governance.artifacts a
WHERE a.id = 'ep000000-gov0-0000-0000-000000000001';
