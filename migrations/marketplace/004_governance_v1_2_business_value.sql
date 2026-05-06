-- ============================================================
-- Module de gouvernance Perform-Learn.fr
-- Migration v1.2 — Valeur business par artefact
-- Schéma : governance
-- ============================================================

-- ------------------------------------------------------------
-- 1. Nouvelles colonnes sur governance.artifacts
-- ------------------------------------------------------------

ALTER TABLE governance.artifacts
  ADD COLUMN IF NOT EXISTS business_value SMALLINT DEFAULT NULL
    CHECK (business_value BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS value_type VARCHAR(30) DEFAULT NULL
    CHECK (value_type IN (
      'revenue_impact',
      'cost_reduction',
      'risk_mitigation',
      'strategic_positioning',
      'user_acquisition'
    )),
  ADD COLUMN IF NOT EXISTS value_note TEXT DEFAULT NULL;

COMMENT ON COLUMN governance.artifacts.business_value IS 'Score de valeur business : 0 (nul) à 100 (critique). NULL = non estimé.';
COMMENT ON COLUMN governance.artifacts.value_type     IS 'Nature de la valeur : revenue_impact | cost_reduction | risk_mitigation | strategic_positioning | user_acquisition';
COMMENT ON COLUMN governance.artifacts.value_note     IS 'Rationale court expliquant l''estimation de valeur business';

CREATE INDEX IF NOT EXISTS idx_artifacts_business_value
  ON governance.artifacts (business_value DESC NULLS LAST);

-- ------------------------------------------------------------
-- 2. Recréer v_artifact_context pour inclure les nouvelles colonnes
-- DROP requis car CREATE OR REPLACE VIEW interdit de changer
-- l'ordre des colonnes (même pattern que v1.1 pour sort_order).
-- ------------------------------------------------------------

DROP VIEW IF EXISTS governance.v_artifact_context CASCADE;

CREATE VIEW governance.v_artifact_context AS
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
    a.sort_order,
    -- Valeur business (v1.2)
    a.business_value,
    a.value_type,
    a.value_note,
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
    'Vue enrichie v1.2 — sort_order + business_value/value_type/value_note';

-- ------------------------------------------------------------
-- 3. Log de migration
-- ------------------------------------------------------------

DO $$
DECLARE
  v_project_id UUID := '10000000-0000-0000-0000-000000000001';
  v_actor_id   UUID := '00000000-0000-0000-0000-000000000002';  -- Claude Agent
  v_vision_id  UUID := '20000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO governance.execution_logs
    (artifact_id, actor_id, actor_type, action, new_value, note)
  VALUES (
    v_vision_id,
    v_actor_id,
    'agent',
    'schema_migrated',
    '{"migration": "v1.2", "changes": ["business_value SMALLINT", "value_type VARCHAR(30)", "value_note TEXT", "v_artifact_context updated"]}',
    'Migration v1.2 appliquée — dimension valeur business ajoutée sur governance.artifacts'
  );
END $$;

-- ============================================================
-- VÉRIFICATION
-- ============================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'governance'
  AND table_name   = 'artifacts'
  AND column_name  IN ('business_value', 'value_type', 'value_note')
ORDER BY column_name;
