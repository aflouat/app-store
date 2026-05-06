-- ============================================================
-- Migration governance v1.2 — FIX vue v_artifact_context
-- Corrige : la vue v1.1 contenait sort_order à la position 13,
-- rendant CREATE OR REPLACE VIEW impossible (changement d'ordre).
-- DROP requis (comme pour v1.1) pour reconstruire proprement.
-- ============================================================

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

-- ============================================================
-- VÉRIFICATION : colonnes de la vue
-- ============================================================

SELECT column_name, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'governance'
  AND table_name   = 'v_artifact_context'
  AND column_name  IN ('sort_order', 'business_value', 'value_type', 'value_note')
ORDER BY ordinal_position;
