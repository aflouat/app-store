-- ============================================================
-- Seed Roadmap Perform-Learn — Gouvernance v1
-- Étapes 4 & 5 : Artefacts + Métriques Nord-Star Cycle 2
-- Base : appstore | Schéma : governance
-- ============================================================

-- UUIDs fixes pour assurer la cohérence des parent_id
-- project_id  = '10000000-0000-0000-0000-000000000001'
-- created_by  = '00000000-0000-0000-0000-000000000001'  (Abdel)

-- ============================================================
-- NIVEAU STRATÉGIQUE — Vision + Roadmap Cycles
-- ============================================================

INSERT INTO governance.artifacts
    (id, project_id, parent_id, type_slug, title, description, status, priority, sort_order, created_by)
VALUES

-- Vision
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'vision',
    'Vision — Digital Service Hub haut de gamme',
    'Connecter consultants freelance ERP/D365 et entreprises via une plateforme automatisée qui libère le talent de la paperasse. Lancement public cible : 30 avril 2026.',
    'in_progress', 1, 0,
    '00000000-0000-0000-0000-000000000001'
),

-- Cycle 0
(
    '20000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'roadmap_cycle',
    'Cycle 0 — Validation',
    'Validation du concept, choix d'architecture, setup VPS OVH, domaine perform-learn.fr.',
    'done', 2, 10,
    '00000000-0000-0000-0000-000000000001'
),

-- Cycle 1
(
    '20000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'roadmap_cycle',
    'Cycle 1 — Infra & Waitlist',
    'Infra Docker opérationnelle (PostgreSQL, MinIO, Umami, Caddy), landing page et API waitlist déployées.',
    'done', 2, 20,
    '00000000-0000-0000-0000-000000000001'
),

-- Cycle 2 (courant)
(
    '20000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'roadmap_cycle',
    'Cycle 2 — Portail + Autorité LPA',
    'Portail App Store Next.js sur Vercel, dashboard Sommet v1, marketing Phase B (papiers LPA + LinkedIn + Brevo).',
    'in_progress', 1, 30,
    '00000000-0000-0000-0000-000000000001'
),

-- Cycle 3
(
    '20000000-0000-0000-0000-000000000013',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'roadmap_cycle',
    'Cycle 3 — Première app métier',
    'Déploiement de la première app métier (meteo-projet ou gestion de stock) avec tracking Umami.',
    'draft', 2, 40,
    '00000000-0000-0000-0000-000000000001'
),

-- Cycle 4
(
    '20000000-0000-0000-0000-000000000014',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'roadmap_cycle',
    'Cycle 4 — Lancement public',
    'Ouverture publique de la plateforme, onboarding premiers utilisateurs, monétisation initiale.',
    'draft', 2, 50,
    '00000000-0000-0000-0000-000000000001'
),

-- Cycle 5
(
    '20000000-0000-0000-0000-000000000015',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'roadmap_cycle',
    'Cycle 5 — Croissance',
    'Acquisition utilisateurs, optimisation funnel, nouvelles apps métiers, partenariats.',
    'draft', 3, 60,
    '00000000-0000-0000-0000-000000000001'
),

-- Cycle 6
(
    '20000000-0000-0000-0000-000000000016',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'roadmap_cycle',
    'Cycle 6 — Monétisation',
    'Modèles de revenus actifs, scale infrastructure, recrutement communauté freelance.',
    'draft', 3, 70,
    '00000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- NIVEAU TACTIQUE — Epics du Cycle 2
-- ============================================================

INSERT INTO governance.artifacts
    (id, project_id, parent_id, type_slug, title, description, status, priority, sort_order, created_by)
VALUES

-- Epic : Portail App Store
(
    '20000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000012',
    'epic',
    'Portail App Store',
    'Front Next.js 14 déployé sur Vercel. Catalogue d'apps, auth magic link, intégration PostgreSQL VPS.',
    'in_progress', 1, 10,
    '00000000-0000-0000-0000-000000000001'
),

-- Epic : Dashboard Sommet v1
(
    '20000000-0000-0000-0000-000000000021',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000012',
    'epic',
    'Dashboard Sommet v1',
    'Dashboard personnel de suivi de projet avec visuel montagne et barre de progression des tâches.',
    'in_progress', 2, 20,
    '00000000-0000-0000-0000-000000000001'
),

-- Epic : Marketing Phase B
(
    '20000000-0000-0000-0000-000000000022',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000012',
    'epic',
    'Marketing Phase B',
    'Campagne de contenu pour établir l'autorité LPA : papiers de fond, posts LinkedIn, email waitlist via Brevo.',
    'in_progress', 2, 30,
    '00000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- NIVEAU OPÉRATIONNEL — User Stories par Epic
-- ============================================================

INSERT INTO governance.artifacts
    (id, project_id, parent_id, type_slug, title, description, status, priority, sort_order, created_by)
VALUES

-- Stories : Portail App Store
(
    '20000000-0000-0000-0000-000000000030',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000020',
    'user_story',
    'Page catalogue apps',
    'En tant qu'utilisateur, je vois la liste des apps disponibles avec titre, description et bouton d'accès. Les données viennent de store.apps via l'API VPS.',
    'in_progress', 1, 10,
    '00000000-0000-0000-0000-000000000001'
),
(
    '20000000-0000-0000-0000-000000000031',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000020',
    'user_story',
    'Auth magic link',
    'En tant qu'utilisateur, je m'authentifie via un lien email sans mot de passe (magic link). Session stockée côté client.',
    'draft', 1, 20,
    '00000000-0000-0000-0000-000000000001'
),
(
    '20000000-0000-0000-0000-000000000032',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000020',
    'user_story',
    'Page Le Labo (LPA)',
    'En tant que visiteur, j'accède à une page éditoriale présentant l'expertise LPA (Lean Project Approach) avec articles et ressources.',
    'draft', 2, 30,
    '00000000-0000-0000-0000-000000000001'
),

-- Stories : Dashboard Sommet v1
(
    '20000000-0000-0000-0000-000000000033',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000021',
    'user_story',
    'Choix photo montagne',
    'En tant qu'utilisateur, je sélectionne une photo de montagne comme fond de tableau de bord pour personnaliser mon espace.',
    'draft', 3, 10,
    '00000000-0000-0000-0000-000000000001'
),
(
    '20000000-0000-0000-0000-000000000034',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000021',
    'user_story',
    'Tâches statiques + barre progression',
    'En tant qu'utilisateur, je vois mes tâches du cycle courant et une barre de progression visuelle vers le sommet.',
    'draft', 2, 20,
    '00000000-0000-0000-0000-000000000001'
),

-- Stories : Marketing Phase B
(
    '20000000-0000-0000-0000-000000000035',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000022',
    'user_story',
    'Papiers LPA #1 et #2',
    'Rédiger et publier deux articles de fond positionnant la méthode LPA : audience cible consultants ERP senior.',
    'draft', 2, 10,
    '00000000-0000-0000-0000-000000000001'
),
(
    '20000000-0000-0000-0000-000000000036',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000022',
    'user_story',
    'Posts LinkedIn #4 et #5',
    'Publier deux posts LinkedIn à forte valeur (retours terrain, micro-cas client) pour alimenter l'autorité et la waitlist.',
    'draft', 2, 20,
    '00000000-0000-0000-0000-000000000001'
),
(
    '20000000-0000-0000-0000-000000000037',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000022',
    'user_story',
    'Email waitlist Brevo',
    'Configurer Brevo, importer les inscrits waitlist, envoyer un premier email de nurturing avant lancement.',
    'draft', 2, 30,
    '00000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- ÉTAPE 5 — Métriques Nord-Star Cycle 2
-- ============================================================

INSERT INTO governance.metrics
    (artifact_id, name, description, target, unit, status)
VALUES
(
    '20000000-0000-0000-0000-000000000012',
    'Utilisateurs connectés',
    'Nombre d'utilisateurs ayant créé un compte et accédé au portail d'ici la fin du Cycle 2.',
    20, 'utilisateurs', 'pending'
),
(
    '20000000-0000-0000-0000-000000000012',
    'Temps moyen sur portail',
    'Durée moyenne de session sur le portail App Store (indicateur engagement).',
    120, 'secondes', 'pending'
),
(
    '20000000-0000-0000-0000-000000000012',
    'Vues articles LPA',
    'Nombre de vues par article LPA publié (mesure via Umami).',
    500, 'vues/article', 'pending'
),
(
    '20000000-0000-0000-0000-000000000012',
    'Nouvelles inscriptions waitlist',
    'Inscrits waitlist supplémentaires générés pendant le Cycle 2.',
    30, 'inscrits', 'pending'
);

-- ============================================================
-- ÉTAPE 7 — Premier log d'exécution (traçabilité setup)
-- ============================================================

INSERT INTO governance.execution_logs
    (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES (
    '20000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000002',
    'agent',
    'onboarding_step',
    '{"status": "in_progress", "seed": "roadmap_v1_applied"}',
    'Setup initial module gouvernance — migration v1 + seed roadmap Perform-Learn appliqués.'
);

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================

-- Artefacts par niveau
SELECT at.level, COUNT(*) AS nb
FROM governance.artifacts a
JOIN governance.artifact_types at ON at.slug = a.type_slug
GROUP BY at.level ORDER BY at.level;

-- Vue onboarding agent
SELECT level, type_label, title, status, metric_count, last_action
FROM governance.v_artifact_context
ORDER BY level, sort_order, title;
