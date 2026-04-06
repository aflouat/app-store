-- ============================================================
-- Migration governance v1.1 — Ajout sort_order dans la vue
-- Corrige le bug : sort_order absent de v_artifact_context
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
    a.sort_order,
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
    'Vue enrichie v1.1 — ajout sort_order pour tri correct dans les routes API';
