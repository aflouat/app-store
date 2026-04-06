-- ============================================================
-- Gouvernance — Artefacts pour la US "CTAs actifs"
-- À exécuter AVANT de lancer Claude Code
-- ============================================================

-- UUIDs fixes pour référence dans TASK.md et execution_logs
-- epic parent  : à remplacer par l'UUID réel de "Epic : Portail App Store" en BDD
-- Récupérer avec :
--   SELECT id FROM governance.artifacts
--   WHERE type_slug = 'epic' AND title ILIKE '%Portail App Store%';

-- ------------------------------------------------------------
-- USER STORY
-- ------------------------------------------------------------
INSERT INTO governance.artifacts (
    id,
    project_id,
    parent_id,        -- UUID de l'epic "Portail App Store"
    type_slug,
    title,
    description,
    body,
    status,
    priority,
    assignee_id,
    sort_order,
    tags,
    metadata,
    created_by
) VALUES (
    'a5000000-0ca0-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',  -- perform-learn
    (SELECT id FROM governance.artifacts
     WHERE type_slug = 'epic' AND title ILIKE '%Portail App Store%'
     LIMIT 1),
    'user_story',
    'CTAs actifs — waitlist contextuelle et toast "bientôt disponible"',
    'En tant que visiteur, je veux pouvoir rejoindre une liste d''attente pour n''importe quel service, app ou skill non disponible, afin d''être notifié à son lancement.',
    E'## Contexte\n'
    'Les boutons "Rejoindre la waitlist" et "Ouvrir l''app" sont actuellement des `<button>` statiques sans action.\n\n'
    '## Comportement attendu\n\n'
    '### "Rejoindre la waitlist"\n'
    '- Ouvre un modal contextuel (email + objet cible)\n'
    '- POST vers l''API VPS existante : `{ email, target_type, target_slug, target_label }`\n'
    '- Toast success à la confirmation\n'
    '- Réutilisable sur app, service, skill, consultant\n\n'
    '### "Ouvrir l''app"\n'
    '- Toast "Bientôt disponible" (3 secondes)\n'
    '- Pas de redirect pour l''instant\n\n'
    '## Critères d''acceptation\n'
    '- [ ] Modal s''ouvre avec le bon `targetLabel` selon le contexte\n'
    '- [ ] Soumission email valide → appel API → toast success → modal fermé\n'
    '- [ ] Email invalide → validation HTML5 bloque\n'
    '- [ ] Escape / clic overlay → modal fermé sans soumission\n'
    '- [ ] "Ouvrir l''app" → toast info 3s, pas de navigation\n'
    '- [ ] Erreur API → message inline, modal reste ouvert\n'
    '- [ ] `NEXT_PUBLIC_API_URL` documenté dans `.env.example`',
    'ready',
    2,
    '00000000-0000-0000-0000-000000000001',  -- Abdel
    30,
    ARRAY['cta', 'waitlist', 'modal', 'cycle-2'],
    '{"sprint": "S3-avril-2026", "lean_hypothesis": "Si les CTAs sont actifs, alors le taux d inscription waitlist augmente"}',
    '00000000-0000-0000-0000-000000000001'
);

-- ------------------------------------------------------------
-- TÂCHES ATOMIQUES (enfants de la user story)
-- ------------------------------------------------------------

-- Tâche 1 — postWaitlist() dans lib/api.ts
INSERT INTO governance.artifacts (
    id, project_id, parent_id, type_slug, title, description,
    status, priority, assignee_id, sort_order, tags, metadata, created_by
) VALUES (
    'a7000000-0ca0-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'a5000000-0ca0-0000-0000-000000000001',
    'task',
    'Ajouter postWaitlist() dans lib/api.ts',
    'Fonction async POST vers l''API VPS. Payload : email, target_type, target_slug, target_label. Fallback mock si NEXT_PUBLIC_API_URL absent.',
    'draft', 2, '00000000-0000-0000-0000-000000000002',  -- Claude Agent
    10, ARRAY['api', 'lib'], '{"file": "lib/api.ts"}',
    '00000000-0000-0000-0000-000000000001'
);

-- Tâche 2 — useToast hook
INSERT INTO governance.artifacts (
    id, project_id, parent_id, type_slug, title, description,
    status, priority, assignee_id, sort_order, tags, metadata, created_by
) VALUES (
    'a7000000-0ca0-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'a5000000-0ca0-0000-0000-000000000001',
    'task',
    'Créer hooks/useToast.ts (ou brancher l''existant)',
    'Hook toast minimaliste : showToast(message, type). Auto-dismiss 3s. Si sonner/react-hot-toast déjà installé, wrapper uniquement.',
    'draft', 2, '00000000-0000-0000-0000-000000000002',
    20, ARRAY['hook', 'toast', 'ux'], '{"file": "hooks/useToast.ts"}',
    '00000000-0000-0000-0000-000000000001'
);

-- Tâche 3 — WaitlistModal.tsx
INSERT INTO governance.artifacts (
    id, project_id, parent_id, type_slug, title, description,
    status, priority, assignee_id, sort_order, tags, metadata, created_by
) VALUES (
    'a7000000-0ca0-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'a5000000-0ca0-0000-0000-000000000001',
    'task',
    'Créer components/WaitlistModal.tsx',
    'Modal contextuel "use client". Props : isOpen, onClose, targetType, targetSlug, targetLabel. createPortal, trap focus, charte Terracotta #B9958D / Sauge #96AEAA.',
    'draft', 2, '00000000-0000-0000-0000-000000000002',
    30, ARRAY['component', 'modal', 'a11y'], '{"file": "components/WaitlistModal.tsx"}',
    '00000000-0000-0000-0000-000000000001'
);

-- Tâche 4 — Brancher AppCard.tsx
INSERT INTO governance.artifacts (
    id, project_id, parent_id, type_slug, title, description,
    status, priority, assignee_id, sort_order, tags, metadata, created_by
) VALUES (
    'a7000000-0ca0-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'a5000000-0ca0-0000-0000-000000000001',
    'task',
    'Brancher WaitlistModal et toast dans AppCard.tsx',
    '"Ouvrir l''app" → toast info. "Rejoindre la waitlist" → WaitlistModal avec targetType=app, targetSlug=app.slug.',
    'draft', 2, '00000000-0000-0000-0000-000000000002',
    40, ARRAY['component', 'appcard'], '{"file": "components/AppCard.tsx"}',
    '00000000-0000-0000-0000-000000000001'
);

-- Tâche 5 — Brancher WaitlistBanner.tsx
INSERT INTO governance.artifacts (
    id, project_id, parent_id, type_slug, title, description,
    status, priority, assignee_id, sort_order, tags, metadata, created_by
) VALUES (
    'a7000000-0ca0-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    'a5000000-0ca0-0000-0000-000000000001',
    'task',
    'Brancher WaitlistModal dans WaitlistBanner.tsx',
    'targetType=service, targetSlug=platform, targetLabel=Perform-Learn. Waitlist générale plateforme.',
    'draft', 2, '00000000-0000-0000-0000-000000000002',
    50, ARRAY['component', 'banner'], '{"file": "components/WaitlistBanner.tsx"}',
    '00000000-0000-0000-0000-000000000001'
);

-- Tâche 6 — .env.example
INSERT INTO governance.artifacts (
    id, project_id, parent_id, type_slug, title, description,
    status, priority, assignee_id, sort_order, tags, metadata, created_by
) VALUES (
    'a7000000-0ca0-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    'a5000000-0ca0-0000-0000-000000000001',
    'task',
    'Documenter NEXT_PUBLIC_API_URL dans .env.example',
    'Vérifier .env.local, ajouter la variable si absente, documenter dans .env.example.',
    'draft', 3, '00000000-0000-0000-0000-000000000002',
    60, ARRAY['config', 'env'], '{"file": ".env.example"}',
    '00000000-0000-0000-0000-000000000001'
);

-- ------------------------------------------------------------
-- LOG D'INITIALISATION
-- ------------------------------------------------------------
INSERT INTO governance.execution_logs (
    artifact_id, actor_id, actor_type, action, new_value, note
) VALUES (
    'a5000000-0ca0-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'human',
    'created',
    '{"status": "ready"}',
    'US créée et artefacts tâches insérés. Prêt à passer à Claude Code.'
);

-- ------------------------------------------------------------
-- VÉRIFICATION
-- ------------------------------------------------------------
SELECT
    at.level,
    a.type_slug,
    a.title,
    a.status,
    a.sort_order
FROM governance.artifacts a
JOIN governance.artifact_types at ON at.slug = a.type_slug
WHERE a.id IN (
    'a5000000-0ca0-0000-0000-000000000001',
    'a7000000-0ca0-0000-0000-000000000001',
    'a7000000-0ca0-0000-0000-000000000002',
    'a7000000-0ca0-0000-0000-000000000003',
    'a7000000-0ca0-0000-0000-000000000004',
    'a7000000-0ca0-0000-0000-000000000005',
    'a7000000-0ca0-0000-0000-000000000006'
)
ORDER BY at.level DESC, a.sort_order;
