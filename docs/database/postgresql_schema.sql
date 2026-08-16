-- =====================================================================
-- ONG FINANCE PRO — SCHÉMA POSTGRESQL (SERVEUR CENTRAL)
-- Base de vérité multi-organisation, multi-devise, multi-bailleur
-- Conçu pour ONG au Bénin / Afrique de l'Ouest (référentiel SYSCOHADA)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 0. TYPES ÉNUMÉRÉS
-- ---------------------------------------------------------------------

CREATE TYPE user_status        AS ENUM ('active', 'suspended', 'invited');
CREATE TYPE project_status     AS ENUM ('draft', 'active', 'suspended', 'closed');
CREATE TYPE approvable_status  AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'paid');
CREATE TYPE approval_action    AS ENUM ('approved', 'rejected', 'returned');
CREATE TYPE revenue_type       AS ENUM ('subvention', 'don', 'autofinancement', 'remboursement', 'cotisation', 'autre');
CREATE TYPE momo_provider      AS ENUM ('mtn', 'moov', 'orange', 'autre');
CREATE TYPE momo_txn_type      AS ENUM ('depot', 'retrait', 'transfert', 'paiement_marchand');
CREATE TYPE momo_txn_status    AS ENUM ('en_attente', 'confirme', 'echoue');
CREATE TYPE audit_action       AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'sync', 'login', 'export');
CREATE TYPE conflict_resolution AS ENUM ('server_wins', 'client_wins', 'manual', 'pending');
CREATE TYPE document_owner_type AS ENUM ('expense', 'revenue', 'project', 'organization', 'budget_line');

-- =====================================================================
-- 1. ORGANISATIONS (multi-tenant)
-- =====================================================================

CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    acronym             VARCHAR(50),
    legal_status        VARCHAR(100),               -- ONG, Association, Fondation...
    registration_number VARCHAR(100),                -- numéro d'agrément ministériel
    country             VARCHAR(100) NOT NULL DEFAULT 'Bénin',
    city                VARCHAR(100),
    address             TEXT,
    logo_path           VARCHAR(500),
    default_currency    CHAR(3) NOT NULL DEFAULT 'XOF',
    fiscal_year_start_month SMALLINT NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 2. DEVISES ET TAUX DE CHANGE
-- =====================================================================

CREATE TABLE currencies (
    code    CHAR(3) PRIMARY KEY,      -- XOF, EUR, USD...
    name    VARCHAR(100) NOT NULL,
    symbol  VARCHAR(10) NOT NULL
);

INSERT INTO currencies (code, name, symbol) VALUES
    ('XOF', 'Franc CFA (UEMOA)', 'FCFA'),
    ('EUR', 'Euro', '€'),
    ('USD', 'Dollar américain', '$');

CREATE TABLE exchange_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency   CHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency     CHAR(3) NOT NULL REFERENCES currencies(code),
    rate            NUMERIC(18,6) NOT NULL CHECK (rate > 0),
    rate_date       DATE NOT NULL,
    source          VARCHAR(100),           -- BCEAO, XE.com, saisie manuelle...
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (from_currency, to_currency, rate_date)
);

-- =====================================================================
-- 3. RÔLES ET PERMISSIONS (RBAC)
-- =====================================================================

CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL,     -- super_admin, org_admin, coordinator...
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    hierarchy_level SMALLINT NOT NULL DEFAULT 0       -- utilisé pour l'escalade d'approbation
);

INSERT INTO roles (code, name, hierarchy_level) VALUES
    ('super_admin',      'Super administrateur plateforme', 100),
    ('org_admin',        'Administrateur ONG',              90),
    ('coordinator',      'Coordinateur national',           80),
    ('project_manager',  'Chef de projet',                  60),
    ('accountant',       'Comptable',                       50),
    ('field_officer',    'Agent terrain',                   20),
    ('auditor',          'Auditeur / Commissaire aux comptes', 70),
    ('donor_viewer',     'Bailleur (lecture seule)',        10);

CREATE TABLE permissions (
    id      SERIAL PRIMARY KEY,
    code    VARCHAR(100) UNIQUE NOT NULL,      -- expenses.create, expenses.approve, reports.export...
    name    VARCHAR(150) NOT NULL,
    module  VARCHAR(50) NOT NULL               -- accounting, projects, users, reports...
);

CREATE TABLE role_permissions (
    role_id         INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- =====================================================================
-- 4. UTILISATEURS
-- =====================================================================

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(255) NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    phone               VARCHAR(30),
    password_hash       VARCHAR(255) NOT NULL,
    preferred_language  VARCHAR(5) NOT NULL DEFAULT 'fr',
    status              user_status NOT NULL DEFAULT 'invited',
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un utilisateur peut appartenir à plusieurs ONG avec un rôle différent dans chacune
CREATE TABLE user_organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id         INT NOT NULL REFERENCES roles(id),
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    status          user_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, organization_id)
);

CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_uuid     VARCHAR(100) UNIQUE NOT NULL,  -- généré côté client à l'installation
    device_name     VARCHAR(150),
    platform        VARCHAR(30),                    -- windows, android, ios, web
    app_version     VARCHAR(20),
    last_sync_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 5. BAILLEURS ET PROJETS
-- =====================================================================

CREATE TABLE donors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    donor_type          VARCHAR(50),        -- bailleur_institutionnel, fondation, etat, particulier
    country             VARCHAR(100),
    contact_name        VARCHAR(150),
    contact_email       VARCHAR(255),
    default_currency    CHAR(3) REFERENCES currencies(code) DEFAULT 'XOF',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    donor_id            UUID REFERENCES donors(id),
    code                VARCHAR(30) NOT NULL,          -- ex: PROJ-2026-001
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    total_budget        NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency            CHAR(3) NOT NULL REFERENCES currencies(code),
    start_date          DATE,
    end_date            DATE,
    status              project_status NOT NULL DEFAULT 'draft',
    project_manager_id  UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code)
);

CREATE TABLE budget_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code            VARCHAR(30),                -- rubrique budgétaire bailleur
    category        VARCHAR(150) NOT NULL,       -- ex: "Ressources humaines", "Logistique"
    planned_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency        CHAR(3) NOT NULL REFERENCES currencies(code),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE budget_revisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    revised_by      UUID NOT NULL REFERENCES users(id),
    old_amount      NUMERIC(18,2) NOT NULL,
    new_amount      NUMERIC(18,2) NOT NULL,
    reason          TEXT,
    revised_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 6. RÉFÉRENTIELS COMPTABLES
-- =====================================================================

-- Catégories de dépenses alignées sur le plan comptable SYSCOHADA
-- (organization_id NULL = modèle global fourni par la plateforme)
CREATE TABLE expense_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES expense_categories(id),
    code            VARCHAR(20),         -- code SYSCOHADA, ex: 6041
    name            VARCHAR(150) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_methods (
    id      SERIAL PRIMARY KEY,
    code    VARCHAR(30) UNIQUE NOT NULL,   -- cash, mobile_money_mtn, mobile_money_moov, bank_transfer, cheque
    name    VARCHAR(100) NOT NULL,
    requires_reference BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO payment_methods (code, name, requires_reference) VALUES
    ('cash',                'Espèces',                         FALSE),
    ('mobile_money_mtn',    'MTN Mobile Money',                TRUE),
    ('mobile_money_moov',   'Moov Money',                      TRUE),
    ('mobile_money_orange', 'Orange Money',                    TRUE),
    ('bank_transfer',       'Virement bancaire',               TRUE),
    ('cheque',              'Chèque',                          TRUE);

-- =====================================================================
-- 7. WORKFLOW D'APPROBATION
-- =====================================================================

CREATE TABLE approval_workflows (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                VARCHAR(150) NOT NULL,
    applies_to          VARCHAR(30) NOT NULL,     -- expense, revenue, budget_revision
    min_amount_threshold NUMERIC(18,2),
    max_amount_threshold NUMERIC(18,2),
    currency            CHAR(3) REFERENCES currencies(code),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE approval_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_order      SMALLINT NOT NULL,
    role_id         INT NOT NULL REFERENCES roles(id),
    is_mandatory    BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (workflow_id, step_order)
);

-- =====================================================================
-- 8. DÉPENSES ET RECETTES
-- =====================================================================

CREATE TABLE expenses (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id              UUID NOT NULL REFERENCES projects(id),
    budget_line_id          UUID REFERENCES budget_lines(id),
    category_id             UUID REFERENCES expense_categories(id),
    amount                  NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency                CHAR(3) NOT NULL REFERENCES currencies(code),
    exchange_rate_id        UUID REFERENCES exchange_rates(id),
    amount_in_org_currency  NUMERIC(18,2) NOT NULL,
    supplier_name           VARCHAR(255),
    supplier_contact        VARCHAR(150),
    payment_method_id       INT NOT NULL REFERENCES payment_methods(id),
    payment_reference       VARCHAR(100),           -- ID transaction mobile money, n° chèque...
    expense_date            DATE NOT NULL,
    description             TEXT,
    status                  approvable_status NOT NULL DEFAULT 'draft',
    workflow_id             UUID REFERENCES approval_workflows(id),
    current_step_order      SMALLINT,
    created_by              UUID NOT NULL REFERENCES users(id),
    submitted_at            TIMESTAMPTZ,
    approved_by             UUID REFERENCES users(id),
    approved_at             TIMESTAMPTZ,
    rejection_reason        TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ                       -- soft delete
);

CREATE TABLE revenues (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id              UUID REFERENCES projects(id),
    donor_id                UUID REFERENCES donors(id),
    amount                  NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency                CHAR(3) NOT NULL REFERENCES currencies(code),
    exchange_rate_id        UUID REFERENCES exchange_rates(id),
    amount_in_org_currency  NUMERIC(18,2) NOT NULL,
    revenue_type            revenue_type NOT NULL,
    received_date           DATE NOT NULL,
    payment_method_id       INT NOT NULL REFERENCES payment_methods(id),
    payment_reference       VARCHAR(100),
    description             TEXT,
    status                  approvable_status NOT NULL DEFAULT 'draft',
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ
);

-- Journal des actions d'approbation (traçabilité complète)
CREATE TABLE approval_actions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approvable_type VARCHAR(20) NOT NULL,      -- 'expense' ou 'revenue'
    approvable_id   UUID NOT NULL,
    step_id         UUID REFERENCES approval_steps(id),
    approver_id     UUID NOT NULL REFERENCES users(id),
    action          approval_action NOT NULL,
    comment         TEXT,
    action_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_approval_actions_target ON approval_actions(approvable_type, approvable_id);

-- =====================================================================
-- 9. TRANSACTIONS MOBILE MONEY (réconciliation)
-- =====================================================================

CREATE TABLE mobile_money_transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider                momo_provider NOT NULL,
    provider_transaction_id VARCHAR(100) NOT NULL,     -- ID renvoyé par MTN/Moov/Orange
    phone_number            VARCHAR(20) NOT NULL,
    amount                  NUMERIC(18,2) NOT NULL,
    currency                CHAR(3) NOT NULL DEFAULT 'XOF',
    transaction_type        momo_txn_type NOT NULL,
    transaction_date        TIMESTAMPTZ NOT NULL,
    status                  momo_txn_status NOT NULL DEFAULT 'en_attente',
    reconciled_expense_id   UUID REFERENCES expenses(id),
    reconciled_revenue_id   UUID REFERENCES revenues(id),
    raw_payload             JSONB,                       -- réponse brute de l'API opérateur
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_transaction_id)
);

-- =====================================================================
-- 10. DOCUMENTS (factures, reçus, justificatifs)
-- =====================================================================

CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_type          document_owner_type NOT NULL,
    owner_id            UUID NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    file_path           VARCHAR(500) NOT NULL,      -- chemin S3 / Supabase Storage
    file_type           VARCHAR(20),
    file_size_bytes     BIGINT,
    sha256_hash         CHAR(64) NOT NULL,           -- intégrité + déduplication
    uploaded_by         UUID NOT NULL REFERENCES users(id),
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_owner ON documents(owner_type, owner_id);

-- =====================================================================
-- 11. RAPPORTS
-- =====================================================================

CREATE TABLE report_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    donor_id        UUID REFERENCES donors(id),
    name            VARCHAR(150) NOT NULL,          -- ex: "Rapport financier UE", "Export SYSCOHADA"
    format          VARCHAR(20) NOT NULL,            -- pdf, excel, docx
    structure       JSONB NOT NULL,                  -- configuration des sections/colonnes
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id),
    template_id     UUID REFERENCES report_templates(id),
    report_type     VARCHAR(50) NOT NULL,
    period_start    DATE,
    period_end      DATE,
    generated_by    UUID NOT NULL REFERENCES users(id),
    file_path       VARCHAR(500),
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 12. AUDIT ET TRAÇABILITÉ
-- =====================================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    device_id       UUID REFERENCES devices(id),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID,
    action          audit_action NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_org_date ON audit_logs(organization_id, created_at);

-- =====================================================================
-- 13. SYNCHRONISATION (côté serveur)
-- =====================================================================

CREATE TABLE sync_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id           UUID NOT NULL REFERENCES devices(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    records_pushed      INT DEFAULT 0,
    records_pulled      INT DEFAULT 0,
    conflicts_detected  INT DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'in_progress'  -- in_progress, completed, failed
);

CREATE TABLE sync_conflicts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    local_version   JSONB NOT NULL,
    server_version  JSONB NOT NULL,
    device_id       UUID REFERENCES devices(id),
    user_id         UUID REFERENCES users(id),
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolution      conflict_resolution NOT NULL DEFAULT 'pending',
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ
);

-- =====================================================================
-- 14. INDEX DE PERFORMANCE (multi-tenant : toujours filtrer par organisation_id)
-- =====================================================================

CREATE INDEX idx_expenses_org_status   ON expenses(organization_id, status);
CREATE INDEX idx_expenses_project_date ON expenses(project_id, expense_date);
CREATE INDEX idx_revenues_org_status   ON revenues(organization_id, status);
CREATE INDEX idx_projects_org          ON projects(organization_id, status);
CREATE INDEX idx_user_orgs_lookup      ON user_organizations(user_id, organization_id);
CREATE INDEX idx_momo_txn_org          ON mobile_money_transactions(organization_id, status);

-- =====================================================================
-- 15. ISOLATION MULTI-TENANT (Row Level Security — activation recommandée)
-- =====================================================================
-- Exemple pour la table expenses : à répliquer sur toutes les tables
-- portant organization_id, avec la variable de session définie par
-- l'API Laravel à chaque requête (SET app.current_org_id = '...').
--
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY org_isolation_expenses ON expenses
--     USING (organization_id::text = current_setting('app.current_org_id', true));
