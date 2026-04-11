-- ============================================================
-- Seed — Valeur business par Epic et User Story
-- Prérequis : migration_governance_v1_2.sql appliqué
-- ============================================================

-- Grille de scoring (0-100) :
--   90-100 : Critique — bloque le lancement ou génère le max de revenus
--   75-89  : Haute — impact direct sur acquisition ou revenu
--   50-74  : Moyenne — important mais pas bloquant
--   25-49  : Faible — UX / confort, peut attendre
--   0-24   : Très faible — nice-to-have, dépriorisable

-- Types de valeur :
--   revenue_impact        : génère directement du chiffre d'affaires
--   user_acquisition      : attire ou convertit de nouveaux utilisateurs
--   cost_reduction        : réduit le coût de développement ou d'exploitation
--   risk_mitigation       : réduit un risque métier ou technique
--   strategic_positioning : renforce l'autorité ou la différenciation de marque


-- ============================================================
-- EPICS — Cycle 2
-- ============================================================

UPDATE governance.artifacts SET
  business_value = 85,
  value_type     = 'user_acquisition',
  value_note     = 'Chemin direct vers les utilisateurs — sans portail, pas de store et pas de lancement possible.'
WHERE id = '20000000-0000-0000-0000-000000000020';  -- Epic Portail App Store

UPDATE governance.artifacts SET
  business_value = 70,
  value_type     = 'user_acquisition',
  value_note     = 'Contenu LPA + LinkedIn + Brevo alimente la waitlist avant lancement. ROI mesuré sur nouveaux inscrits.'
WHERE id = '20000000-0000-0000-0000-000000000022';  -- Epic Marketing Phase B

UPDATE governance.artifacts SET
  business_value = 65,
  value_type     = 'cost_reduction',
  value_note     = 'Dashboard gouvernance réduit le coût cognitif du pilotage et accélère les sessions Claude Code (onboarding agent).'
WHERE id = 'b0e00000-0000-0000-0000-000000000001';  -- Epic /govern Interface

UPDATE governance.artifacts SET
  business_value = 40,
  value_type     = 'strategic_positioning',
  value_note     = 'Différenciateur UX motivant, mais non critique pour le lancement public du 30 avril.'
WHERE id = '20000000-0000-0000-0000-000000000021';  -- Epic Dashboard Sommet v1


-- ============================================================
-- USER STORIES — Portail App Store
-- ============================================================

UPDATE governance.artifacts SET
  business_value = 90,
  value_type     = 'user_acquisition',
  value_note     = 'Cœur UX du store : sans catalogue apps, le portail n''a pas de raison d''être. Bloquant pour le lancement.'
WHERE id = '20000000-0000-0000-0000-000000000030';  -- Page catalogue apps

UPDATE governance.artifacts SET
  business_value = 75,
  value_type     = 'user_acquisition',
  value_note     = 'Onboarding sans friction (pas de mot de passe). Réduit le drop à l''inscription et accélère le Time-to-Contract.'
WHERE id = '20000000-0000-0000-0000-000000000031';  -- Auth magic link

UPDATE governance.artifacts SET
  business_value = 60,
  value_type     = 'strategic_positioning',
  value_note     = 'Page éditoriale LPA construisant l''autorité de marque. Impact indirect sur conversion long terme.'
WHERE id = '20000000-0000-0000-0000-000000000032';  -- Page Le Labo (LPA)


-- ============================================================
-- USER STORIES — Dashboard Sommet v1
-- ============================================================

UPDATE governance.artifacts SET
  business_value = 35,
  value_type     = 'strategic_positioning',
  value_note     = 'Personnalisation visuelle sympa, mais n''impacte pas directement les métriques business du Cycle 2.'
WHERE id = '20000000-0000-0000-0000-000000000034';  -- Tâches statiques + barre progression

UPDATE governance.artifacts SET
  business_value = 20,
  value_type     = 'strategic_positioning',
  value_note     = 'Nice-to-have. Valeur de personnalisation faible vs coût d''implémentation. Candidat à la déprioritisation.'
WHERE id = '20000000-0000-0000-0000-000000000033';  -- Choix photo montagne


-- ============================================================
-- USER STORIES — Marketing Phase B
-- ============================================================

UPDATE governance.artifacts SET
  business_value = 70,
  value_type     = 'user_acquisition',
  value_note     = 'Email nurturing waitlist via Brevo — convertit les inscrits passifs en utilisateurs actifs au lancement.'
WHERE id = '20000000-0000-0000-0000-000000000037';  -- Email waitlist Brevo

UPDATE governance.artifacts SET
  business_value = 65,
  value_type     = 'strategic_positioning',
  value_note     = 'Papiers LPA #1 et #2 : positionnement d''autorité, SEO long terme, preuve d''expertise pour les clients.'
WHERE id = '20000000-0000-0000-0000-000000000035';  -- Papiers LPA #1 et #2

UPDATE governance.artifacts SET
  business_value = 55,
  value_type     = 'user_acquisition',
  value_note     = 'Posts LinkedIn #4 et #5 génèrent de la visibilité organique et alimentent la waitlist indirectement.'
WHERE id = '20000000-0000-0000-0000-000000000036';  -- Posts LinkedIn #4 et #5


-- ============================================================
-- USER STORIES — CTAs actifs (Epic Portail App Store)
-- ============================================================

UPDATE governance.artifacts SET
  business_value = 80,
  value_type     = 'user_acquisition',
  value_note     = 'Capture de leads directe — les CTAs inactifs = zéro conversion. Impact immédiat et mesurable sur le taux d''inscription.'
WHERE id = 'a5000000-0ca0-0000-0000-000000000001';  -- CTAs actifs waitlist contextuelle


-- ============================================================
-- USER STORIES — Epic /govern Interface
-- ============================================================

UPDATE governance.artifacts SET
  business_value = 70,
  value_type     = 'cost_reduction',
  value_note     = 'Navigation roadmap drill-down : réduit le temps de priorisation et l''onboarding agent à chaque session.'
WHERE id = 'b0e00000-0000-0000-0000-000000000011';  -- Vue roadmap drill-down

UPDATE governance.artifacts SET
  business_value = 65,
  value_type     = 'cost_reduction',
  value_note     = 'Edition statut artefact inline = réduction du switch contexte entre code et gestion projet.'
WHERE id = 'b0e00000-0000-0000-0000-000000000012';  -- Détail artefact — édition statut

UPDATE governance.artifacts SET
  business_value = 60,
  value_type     = 'cost_reduction',
  value_note     = 'Contexte onboarding agent + TASK.md auto-généré : accélère le démarrage de chaque session Claude Code.'
WHERE id = 'b0e00000-0000-0000-0000-000000000013';  -- Vue agent — contexte onboarding

UPDATE governance.artifacts SET
  business_value = 50,
  value_type     = 'cost_reduction',
  value_note     = 'Audit trail humain + agent : traçabilité des décisions, réduction du risque de régression involontaire.'
WHERE id = 'b0e00000-0000-0000-0000-000000000014';  -- Feed audit trail


-- ============================================================
-- LOG D'EXÉCUTION
-- ============================================================

INSERT INTO governance.execution_logs
  (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES (
  '20000000-0000-0000-0000-000000000001',  -- Vision
  '00000000-0000-0000-0000-000000000002',  -- Claude Agent
  'agent',
  'metric_updated',
  '{"seed": "business_value_v1", "artifacts_updated": 17}',
  'Backfill business_value v1 — 17 artefacts (epics + user stories) valorisés avec score 0-100 et type de valeur.'
);


-- ============================================================
-- VÉRIFICATION
-- ============================================================

SELECT
  at.level,
  a.type_slug,
  a.title,
  a.business_value,
  a.value_type,
  a.status
FROM governance.artifacts a
JOIN governance.artifact_types at ON at.slug = a.type_slug
WHERE a.business_value IS NOT NULL
ORDER BY a.business_value DESC, at.level, a.sort_order;
