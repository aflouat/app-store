-- =============================================================
-- init-db.sql — Initialisation PostgreSQL multi-schéma
-- Un schéma par application métier
-- =============================================================

-- Base pour Umami (analytics)
CREATE DATABASE umami;

-- Schémas dans la base principale (appstore)
CREATE SCHEMA IF NOT EXISTS store;      -- App Store (portail)
CREATE SCHEMA IF NOT EXISTS meteo;      -- Meteo-projet
CREATE SCHEMA IF NOT EXISTS stock;      -- Gestion de stock
CREATE SCHEMA IF NOT EXISTS shared;     -- Tables partagées (users, tenants)

-- Commentaires
COMMENT ON SCHEMA store IS 'App Store - portail principal';
COMMENT ON SCHEMA meteo IS 'Meteo-projet - dashboard projet D365/AS400';
COMMENT ON SCHEMA stock IS 'Gestion de stock - app métier';
COMMENT ON SCHEMA shared IS 'Tables partagées entre applications';

-- Table des utilisateurs partagée
CREATE TABLE shared.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des applications enregistrées dans le store
CREATE TABLE store.apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    version VARCHAR(50) DEFAULT '0.1.0',
    status VARCHAR(20) DEFAULT 'draft',  -- draft, published, archived
    url TEXT,                             -- URL Vercel du front
    api_base TEXT,                        -- endpoint API sur le VPS
    owner_id UUID REFERENCES shared.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des installations (qui utilise quoi)
CREATE TABLE store.installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES store.apps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES shared.users(id) ON DELETE CASCADE,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    last_opened_at TIMESTAMPTZ,
    UNIQUE(app_id, user_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_apps_status ON store.apps(status);
CREATE INDEX idx_apps_slug ON store.apps(slug);
CREATE INDEX idx_installations_user ON store.installations(user_id);
CREATE INDEX idx_installations_app ON store.installations(app_id);
