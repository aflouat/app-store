-- ============================================================
-- Module de gouvernance Perform-Learn.fr
-- Migration v1 — PostgreSQL VPS
-- Schéma : governance
-- ============================================================

CREATE SCHEMA IF NOT EXISTS governance;

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- recherche full-text fuzzy

-- ============================================================
-- 1. USERS
-- Humains ET agents IA — même table, actor_type discrimine
-- ============================================================
CREATE TABLE governance.users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type    VARCHAR(10)  NOT NULL DEFAULT 'human'
                               CHECK (actor_type IN ('human', 'agent')),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE,                  -- NULL si agent
    role          VARCHAR(50)  NOT NULL DEFAULT 'contributor'
                               CHECK (role IN ('owner', 'lead', 'contributor', 'viewer', 'agent')),
    agent_model   VARCHAR(100),                         -- ex: 'claude-sonnet-4-6', NULL si human
    metadata      JSONB        NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  governance.users              IS 'Acteurs du système : humains et agents IA';
COMMENT ON COLUMN governance.users.actor_type   IS 'human | agent';
COMMENT ON COLUMN governance.users.agent_model  IS 'Modèle IA utilisé (agents uniquement)';

-- ------------------------------------------------------------
-- 2. PROJECTS
-- Un projet = une initiative (ex: Perform-Learn, PMFlow)
-- ------------------------------------------------------------
CREATE TABLE governance.projects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          VARCHAR(100) UNIQUE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'paused', 'archived')),
    owner_id      UUID REFERENCES governance.users(id) ON DELETE SET NULL,
    metadata      JSONB        NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE governance.projects IS 'Périmètre de gouvernance (projet / initiative)';

-- ------------------------------------------------------------
-- 3. ARTIFACT_TYPES
-- Référentiel des types d'artefacts par niveau
-- ------------------------------------------------------------
CREATE TABLE governance.artifact_types (
    slug          VARCHAR(50)  PRIMARY KEY,
    level         VARCHAR(15)  NOT NULL
                               CHECK (level IN ('strategic', 'tactical', 'operational')),
    label         VARCHAR(100) NOT NULL,
    description   TEXT,
    icon          VARCHAR(10),
    sort_order    INTEGER      NOT NULL DEFAULT 0
);

COMMENT ON TABLE governance.artifact_types IS 'Types d artefacts possibles par niveau hiérarchique';

INSERT INTO governance.artifact_types (slug, level, label, description, icon, sort_order) VALUES
-- Niveau stratégique
('vision',           'strategic',    'Vision',              'Intention et raison d être du projet',           '🎯', 10),
('okr',              'strategic',    'OKR',                 'Objectif + résultats clés mesurables',           '📊', 20),
('epic',             'strategic',    'Epic',                'Grande fonctionnalité ou domaine métier',        '🗺', 30),
('roadmap_cycle',    'strategic',    'Cycle Roadmap',       'Période de livraison (Cycle 0, 1, 2...)',        '🔄', 40),
('north_star',       'strategic',    'Métrique Nord-Star',  'KPI principal par phase',                       '⭐', 50),
('e2e_test',         'strategic',    'Test E2E',            'Scénario utilisateur de bout en bout',           '🧪', 60),
-- Niveau tactique
('user_story',       'tactical',     'User Story',          'Besoin fonctionnel + critères d acceptation',    '📖', 10),
('action_plan',      'tactical',     'Plan d action',       'Séquence de livrables pour un cycle',            '📋', 20),
('arch_decision',    'tactical',     'Décision d archi',    'ADR : context, décision, conséquences',          '🏗', 30),
('security_rule',    'tactical',     'Règle de sécurité',   'Contrainte ou exigence de sécurité',             '🔐', 40),
('workflow',         'tactical',     'Workflow',            'Séquence d états et transitions',                '⚙', 50),
('integration_test', 'tactical',     'Test d intégration',  'Contrat API ou flux inter-composants',           '🔗', 60),
-- Niveau opérationnel
('task',             'operational',  'Tâche',               'Unité de travail atomique assignable',           '✅', 10),
('commit_ref',       'operational',  'Référence commit',    'Lien entre code et story/tâche',                 '💻', 20),
('unit_test',        'operational',  'Test unitaire',       'Couverture et résultat d un test de code',       '🔬', 30),
('bug',              'operational',  'Bug',                 'Anomalie constatée à corriger',                  '🐛', 40),
('pivot_decision',   'operational',  'Décision de pivot',   'Signal Lean → changement de cap',               '🔀', 50);

-- ------------------------------------------------------------
-- 4. ARTIFACTS
-- Table centrale — auto-référentielle, polymorphe
-- ------------------------------------------------------------
CREATE TABLE governance.artifacts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID         NOT NULL REFERENCES governance.projects(id) ON DELETE CASCADE,
    parent_id      UUID         REFERENCES governance.artifacts(id) ON DELETE SET NULL,
    type_slug      VARCHAR(50)  NOT NULL REFERENCES governance.artifact_types(slug),
    title          VARCHAR(500) NOT NULL,
    description    TEXT,
    body           TEXT,                                 -- contenu riche (markdown)
    status         VARCHAR(20)  NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'ready', 'in_progress', 'done', 'cancelled', 'blocked')),
    priority       SMALLINT     NOT NULL DEFAULT 2
                                CHECK (priority BETWEEN 1 AND 4),  -- 1=critical, 4=low
    assignee_id    UUID         REFERENCES governance.users(id) ON DELETE SET NULL,
    due_date       DATE,
    sort_order     INTEGER      NOT NULL DEFAULT 0,
    tags           TEXT[]       NOT NULL DEFAULT '{}',
    metadata       JSONB        NOT NULL DEFAULT '{}',
    created_by     UUID         REFERENCES governance.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  governance.artifacts             IS 'Artefact de gouvernance (stratégique, tactique ou opérationnel)';
COMMENT ON COLUMN governance.artifacts.body        IS 'Contenu enrichi en Markdown (description longue, critères, notes)';
COMMENT ON COLUMN governance.artifacts.parent_id   IS 'Hiérarchie : epic → story → tâche';
COMMENT ON COLUMN governance.artifacts.priority    IS '1=critique, 2=haute, 3=normale, 4=basse';
COMMENT ON COLUMN governance.artifacts.metadata    IS 'Données complémentaires libres (ex: sprint, url, commit_hash)';

-- ------------------------------------------------------------
-- 5. METRICS
-- KPIs associés à un artefact (OKR, roadmap cycle, north star)
-- ------------------------------------------------------------
CREATE TABLE governance.metrics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id   UUID         NOT NULL REFERENCES governance.artifacts(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    target        NUMERIC,
    actual        NUMERIC,
    unit          VARCHAR(50),
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'on_track', 'at_risk', 'achieved', 'missed')),
    measured_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE governance.metrics IS 'KPIs et métriques associés à un artefact';

-- ------------------------------------------------------------
-- 6. EXECUTION_LOGS
-- Trace complète de chaque action (humain ou agent)
-- ------------------------------------------------------------
CREATE TABLE governance.execution_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id   UUID         NOT NULL REFERENCES governance.artifacts(id) ON DELETE CASCADE,
    actor_id      UUID         REFERENCES governance.users(id) ON DELETE SET NULL,
    actor_type    VARCHAR(10)  NOT NULL DEFAULT 'human'
                               CHECK (actor_type IN ('human', 'agent')),
    action        VARCHAR(50)  NOT NULL,                -- ex: 'status_changed', 'comment', 'test_run'
    previous_value JSONB,
    new_value      JSONB,
    payload       JSONB        NOT NULL DEFAULT '{}',
    result        VARCHAR(20)  CHECK (result IN ('success', 'failure', 'partial', NULL)),
    note          TEXT,
    logged_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  governance.execution_logs             IS 'Journal complet de toutes les actions (audit trail + onboarding agent)';
COMMENT ON COLUMN governance.execution_logs.action      IS 'Type d action : status_changed | assigned | commented | test_run | pivot | escalated';
COMMENT ON COLUMN governance.execution_logs.previous_value IS 'Valeur avant modification (pour diff)';
COMMENT ON COLUMN governance.execution_logs.new_value      IS 'Valeur après modification';

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX idx_artifacts_project    ON governance.artifacts (project_id);
CREATE INDEX idx_artifacts_parent     ON governance.artifacts (parent_id);
CREATE INDEX idx_artifacts_type       ON governance.artifacts (type_slug);
CREATE INDEX idx_artifacts_status     ON governance.artifacts (status);
CREATE INDEX idx_artifacts_assignee   ON governance.artifacts (assignee_id);
CREATE INDEX idx_artifacts_tags       ON governance.artifacts USING GIN (tags);
CREATE INDEX idx_artifacts_metadata   ON governance.artifacts USING GIN (metadata);
CREATE INDEX idx_artifacts_title_trgm ON governance.artifacts USING GIN (title gin_trgm_ops);

CREATE INDEX idx_metrics_artifact     ON governance.metrics (artifact_id);
CREATE INDEX idx_metrics_status       ON governance.metrics (status);

CREATE INDEX idx_logs_artifact        ON governance.execution_logs (artifact_id);
CREATE INDEX idx_logs_actor           ON governance.execution_logs (actor_id);
CREATE INDEX idx_logs_logged_at       ON governance.execution_logs (logged_at DESC);

-- ============================================================
-- TRIGGERS — updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION governance.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON governance.users
    FOR EACH ROW EXECUTE FUNCTION governance.set_updated_at();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON governance.projects
    FOR EACH ROW EXECUTE FUNCTION governance.set_updated_at();

CREATE TRIGGER trg_artifacts_updated_at
    BEFORE UPDATE ON governance.artifacts
    FOR EACH ROW EXECUTE FUNCTION governance.set_updated_at();

CREATE TRIGGER trg_metrics_updated_at
    BEFORE UPDATE ON governance.metrics
    FOR EACH ROW EXECUTE FUNCTION governance.set_updated_at();

-- ============================================================
-- VUE — contexte complet d'un artefact (pour agent IA)
-- Lecture d'un artefact + parent + métriques + logs récents
-- ============================================================
CREATE OR REPLACE VIEW governance.v_artifact_context AS
SELECT
    a.id,
    a.title,
    a.type_slug,
    at.level,
    at.label                          AS type_label,
    a.status,
    a.priority,
    a.description,
    a.body,
    a.tags,
    a.metadata,
    a.due_date,
    -- Assigné
    u.name                            AS assignee_name,
    u.actor_type                      AS assignee_type,
    -- Parent
    p.id                              AS parent_id,
    p.title                           AS parent_title,
    p.type_slug                       AS parent_type,
    -- Projet
    pr.name                           AS project_name,
    pr.slug                           AS project_slug,
    -- Métriques agrégées
    (SELECT COUNT(*) FROM governance.metrics m WHERE m.artifact_id = a.id)          AS metric_count,
    (SELECT COUNT(*) FROM governance.metrics m WHERE m.artifact_id = a.id
     AND m.status IN ('on_track', 'achieved'))                                      AS metrics_ok,
    -- Dernier log
    (SELECT el.action FROM governance.execution_logs el
     WHERE el.artifact_id = a.id ORDER BY el.logged_at DESC LIMIT 1)               AS last_action,
    (SELECT el.logged_at FROM governance.execution_logs el
     WHERE el.artifact_id = a.id ORDER BY el.logged_at DESC LIMIT 1)               AS last_action_at,
    a.created_at,
    a.updated_at
FROM      governance.artifacts     a
JOIN      governance.artifact_types at ON at.slug     = a.type_slug
LEFT JOIN governance.users          u  ON u.id        = a.assignee_id
LEFT JOIN governance.artifacts      p  ON p.id        = a.parent_id
JOIN      governance.projects       pr ON pr.id       = a.project_id;

COMMENT ON VIEW governance.v_artifact_context IS
    'Vue enrichie pour lecture par agent IA ou dashboard — contexte complet sans jointures manuelles';

-- ============================================================
-- SEED — Projet Perform-Learn + acteur système
-- ============================================================
INSERT INTO governance.users (id, actor_type, name, email, role, agent_model) VALUES
    ('00000000-0000-0000-0000-000000000001', 'human', 'Abdel', NULL, 'owner', NULL),
    ('00000000-0000-0000-0000-000000000002', 'agent', 'Claude Agent', NULL, 'agent', 'claude-sonnet-4-6');

INSERT INTO governance.projects (id, slug, name, description, owner_id) VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        'perform-learn',
        'Perform-Learn.fr',
        'Digital Service Hub haut de gamme — automatiser l'intermédiation pour libérer le talent de la paperasse.',
        '00000000-0000-0000-0000-000000000001'
    );

-- ============================================================
-- FIN DE MIGRATION
-- ============================================================
