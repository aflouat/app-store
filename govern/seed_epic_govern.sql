-- ============================================================
-- Seed BDD — Epic /govern + User Stories
-- À exécuter AVANT de lancer Claude Code sur GOVERN_SETUP.md
-- UUIDs corrigés (hex valide uniquement : 0-9, a-f)
-- ============================================================

-- Epic /govern
-- b0e00000-0000-0000-0000-000000000001
-- US 1 : b0e00000-0000-0000-0000-000000000011
-- US 2 : b0e00000-0000-0000-0000-000000000012
-- US 3 : b0e00000-0000-0000-0000-000000000013
-- US 4 : b0e00000-0000-0000-0000-000000000014

INSERT INTO governance.artifacts (
    id, project_id, parent_id, type_slug, title, description,
    status, priority, assignee_id, sort_order, tags, created_by
) VALUES (
    'b0e00000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    (SELECT id FROM governance.artifacts
     WHERE type_slug = 'roadmap_cycle' AND title ILIKE '%Cycle 2%' LIMIT 1),
    'epic',
    'App /govern — Interface de gouvernance',
    'Dashboard cockpit reliant priorités business et exécution code. Utilisable par humain et agent IA.',
    'in_progress', 1,
    '00000000-0000-0000-0000-000000000001',
    40, ARRAY['govern','dashboard','agent','cycle-2'],
    '00000000-0000-0000-0000-000000000001'
);

INSERT INTO governance.artifacts
    (id, project_id, parent_id, type_slug, title, status, priority, assignee_id, sort_order, tags, created_by)
VALUES
('b0e00000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000001','b0e00000-0000-0000-0000-000000000001',
 'user_story','Vue roadmap drill-down (cycles → epics → stories → tâches)',
 'done',1,'00000000-0000-0000-0000-000000000002',10,ARRAY['roadmap','navigation'],'00000000-0000-0000-0000-000000000001'),

('b0e00000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000001','b0e00000-0000-0000-0000-000000000001',
 'user_story','Détail artefact — édition statut, champs, tâches enfants',
 'done',1,'00000000-0000-0000-0000-000000000002',20,ARRAY['artifact','edit'],'00000000-0000-0000-0000-000000000001'),

('b0e00000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000001','b0e00000-0000-0000-0000-000000000001',
 'user_story','Vue agent — contexte onboarding + génération TASK.md',
 'done',1,'00000000-0000-0000-0000-000000000002',30,ARRAY['agent','taskmd'],'00000000-0000-0000-0000-000000000001'),

('b0e00000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000001','b0e00000-0000-0000-0000-000000000001',
 'user_story','Feed audit trail — logs humain et agent',
 'done',2,'00000000-0000-0000-0000-000000000002',40,ARRAY['logs','audit'],'00000000-0000-0000-0000-000000000001');

INSERT INTO governance.execution_logs
    (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES
    ('b0e00000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000001','human',
     'created','{"status":"in_progress"}',
     'Epic /govern créé — scaffolding Claude Code démarré');

-- Vérification
SELECT at.level, a.type_slug, a.title, a.status
FROM governance.artifacts a
JOIN governance.artifact_types at ON at.slug = a.type_slug
WHERE a.id IN (
    'b0e00000-0000-0000-0000-000000000001',
    'b0e00000-0000-0000-0000-000000000011',
    'b0e00000-0000-0000-0000-000000000012',
    'b0e00000-0000-0000-0000-000000000013',
    'b0e00000-0000-0000-0000-000000000014'
)
ORDER BY at.level, a.sort_order;
