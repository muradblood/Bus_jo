import { neon } from '@neondatabase/serverless';
import {
  archiveSeedDocument,
  seedUiSettings,
  seedFarePricingRules,
  seedPaymentBanks,
  seedTrustedDomains,
  seedChannelConnectors,
  seedRouteOverrides,
  type ArchiveDocumentName,
} from './archiveSeed.js';

const DATABASE_URL = process.env.DATABASE_URL || '';
let schemaPromise: Promise<void> | null = null;

export function neonConfigured(): boolean {
  return /^postgres(?:ql)?:\/\//i.test(DATABASE_URL);
}

function client() {
  if (!neonConfigured()) throw new Error('DATABASE_URL is not configured');
  return neon(DATABASE_URL);
}

export async function dbQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const sql = client();
  const rows = await sql.query(text, params as never[]);
  return rows as T[];
}

export async function dbExec(text: string, params: unknown[] = []): Promise<number> {
  const sql = client();
  const result = await sql.query(text, params as never[], { fullResults: true }) as unknown as { rowCount?: number };
  return Number(result?.rowCount || 0);
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS api_rate_limits (
    ip_hash CHAR(64) NOT NULL, endpoint VARCHAR(100) NOT NULL, window_bucket BIGINT NOT NULL,
    requests INTEGER NOT NULL DEFAULT 1, last_request_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(ip_hash,endpoint,window_bucket))`,
  `CREATE TABLE IF NOT EXISTS payments (
    payment_id VARCHAR(40) PRIMARY KEY, hold_id VARCHAR(40) NOT NULL, card_last4 CHAR(4) NOT NULL DEFAULT '0000',
    card_brand VARCHAR(24) NOT NULL DEFAULT 'unknown', card_entry_completed INTEGER NOT NULL DEFAULT 0,
    cvv_provided INTEGER NOT NULL DEFAULT 0, otp_hash VARCHAR(255) NOT NULL DEFAULT '', otp_verified INTEGER NOT NULL DEFAULT 0,
    otp_expires_at TIMESTAMPTZ NULL, otp_attempts INTEGER NOT NULL DEFAULT 0,
    gateway_status VARCHAR(32) NOT NULL DEFAULT 'not_configured', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMPTZ NULL)`,
  `CREATE TABLE IF NOT EXISTS payment_bookings (
    booking_id VARCHAR(40) PRIMARY KEY, payment_id VARCHAR(40) NULL, hold_id VARCHAR(40) NULL,
    ticket_id VARCHAR(40) NOT NULL UNIQUE, status VARCHAR(32) NOT NULL, passengers_json TEXT NOT NULL DEFAULT '[]',
    phone VARCHAR(40) NULL, email VARCHAR(190) NULL, trip_id VARCHAR(80) NULL, fare_code VARCHAR(40) NULL,
    ticket_type VARCHAR(40) NULL, travel_date DATE NULL, return_date DATE NULL, total_amount DECIMAL(10,2) NULL,
    payment_method VARCHAR(50) NULL, seats_json TEXT NULL, internal_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS booking_searches (
    id BIGSERIAL PRIMARY KEY, session_id VARCHAR(80) NULL, ip_address VARCHAR(45) NOT NULL,
    origin_city_id INTEGER NOT NULL DEFAULT 0, destination_city_id INTEGER NOT NULL DEFAULT 0,
    origin_name VARCHAR(160) NULL, destination_name VARCHAR(160) NULL, travel_date DATE NOT NULL,
    return_date DATE NULL, service_type VARCHAR(30) NOT NULL DEFAULT 'domestic', trip_type VARCHAR(30) NOT NULL DEFAULT 'oneway',
    passenger_count INTEGER NOT NULL DEFAULT 1, ticket_type VARCHAR(40) NULL, direct_only INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS frontend_submissions (
    id BIGSERIAL PRIMARY KEY, session_id VARCHAR(80) NULL, ip_address VARCHAR(45) NOT NULL,
    form_name VARCHAR(80) NOT NULL, current_step VARCHAR(40) NULL, event_name VARCHAR(80) NOT NULL,
    payload_json TEXT NOT NULL, submission_status VARCHAR(30) NOT NULL DEFAULT 'accepted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS support_messages (
    id BIGSERIAL PRIMARY KEY, session_id VARCHAR(80) NULL, ip_address VARCHAR(45) NOT NULL,
    sender TEXT NOT NULL, message TEXT NOT NULL, current_step VARCHAR(40) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY, session_id VARCHAR(80) NULL, ip_address VARCHAR(45) NOT NULL,
    endpoint VARCHAR(120) NOT NULL, rejected_fields_json VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY, error_code VARCHAR(80) NOT NULL, severity VARCHAR(20) NOT NULL DEFAULT 'error',
    component VARCHAR(80) NOT NULL, request_path VARCHAR(180) NULL, ip_address VARCHAR(45) NULL,
    session_id VARCHAR(80) NULL, message TEXT NOT NULL, context_json TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, role VARCHAR(40) NOT NULL DEFAULT 'admin', active INTEGER NOT NULL DEFAULT 1,
    last_login_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS ui_settings (
    setting_key VARCHAR(100) PRIMARY KEY, setting_value TEXT NOT NULL, updated_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY, admin_user_id BIGINT NULL, action VARCHAR(100) NOT NULL, entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(100) NULL, details_json TEXT NULL, ip_address VARCHAR(45) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(80) PRIMARY KEY, ip_address VARCHAR(45) NOT NULL, ip_hash CHAR(64) NOT NULL,
    current_step VARCHAR(40) NOT NULL DEFAULT 'home', user_agent VARCHAR(255) NULL, blocked_until TIMESTAMPTZ NULL,
    block_reason VARCHAR(255) NULL, connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY, title VARCHAR(160) NOT NULL, message TEXT NOT NULL, target_type TEXT NOT NULL DEFAULT 'all',
    target_value VARCHAR(100) NULL, action_type TEXT NOT NULL DEFAULT 'none', action_value VARCHAR(500) NULL,
    channels_json VARCHAR(255) NOT NULL DEFAULT '["socket"]', scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ NULL, status TEXT NOT NULL DEFAULT 'scheduled', created_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS trusted_domains (
    id BIGSERIAL PRIMARY KEY, domain VARCHAR(190) NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS channel_connectors (
    channel_code VARCHAR(30) PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0, provider VARCHAR(80) NULL,
    configuration_json TEXT NULL, status VARCHAR(30) NOT NULL DEFAULT 'not_configured',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS managed_trips (
    id BIGSERIAL PRIMARY KEY, trip_code VARCHAR(60) NOT NULL UNIQUE, origin_station_id VARCHAR(30) NOT NULL,
    destination_station_id VARCHAR(30) NOT NULL, service_type TEXT NOT NULL DEFAULT 'domestic', departure_at TIMESTAMPTZ NOT NULL,
    arrival_at TIMESTAMPTZ NOT NULL, bus_label VARCHAR(100) NOT NULL, seat_capacity INTEGER NOT NULL DEFAULT 45,
    saver_price DECIMAL(10,2) NOT NULL, standard_price DECIMAL(10,2) NOT NULL, flex_price DECIMAL(10,2) NOT NULL,
    vip_price DECIMAL(10,2) NOT NULL, stops_json TEXT NULL, status TEXT NOT NULL DEFAULT 'scheduled',
    delay_minutes INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS live_booking_sessions (
    session_id VARCHAR(80) PRIMARY KEY, ip_address VARCHAR(45) NOT NULL, origin_station_id VARCHAR(30) NULL,
    origin_name VARCHAR(160) NULL, destination_station_id VARCHAR(30) NULL, destination_name VARCHAR(160) NULL,
    travel_date DATE NULL, trip_id VARCHAR(80) NULL, ticket_type VARCHAR(40) NULL, fare_code VARCHAR(40) NULL,
    seat_numbers_json VARCHAR(255) NULL, passenger_count INTEGER NOT NULL DEFAULT 1, current_step VARCHAR(40) NOT NULL DEFAULT 'home',
    status VARCHAR(40) NOT NULL DEFAULT 'browsing', booking_id VARCHAR(40) NULL, ticket_id VARCHAR(40) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS geo_ip_cache (
    ip_hash CHAR(64) PRIMARY KEY, country_code CHAR(2) NULL, country_name VARCHAR(100) NULL, provider VARCHAR(30) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMPTZ NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS geo_visitors (
    session_id VARCHAR(80) PRIMARY KEY, ip_address VARCHAR(45) NOT NULL, country_code VARCHAR(10) NOT NULL,
    country_name VARCHAR(100) NULL, access_allowed INTEGER NOT NULL, detection_source VARCHAR(30) NOT NULL,
    current_step VARCHAR(40) NOT NULL DEFAULT 'home', visit_count INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS fare_pricing_rules (
    fare_code VARCHAR(30) PRIMARY KEY, display_name VARCHAR(80) NOT NULL, price_per_km DECIMAL(10,4) NOT NULL,
    minimum_price DECIMAL(10,2) NOT NULL, maximum_price DECIMAL(10,2) NOT NULL, active INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS route_overrides (
    route_key VARCHAR(80) PRIMARY KEY, origin_station_id VARCHAR(30) NOT NULL, destination_station_id VARCHAR(30) NOT NULL,
    distance_km INTEGER NOT NULL, duration_minutes INTEGER NOT NULL, stops_json TEXT NULL, active INTEGER NOT NULL DEFAULT 1,
    service_type TEXT NOT NULL DEFAULT 'domestic', updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS route_metric_cache (
    route_key VARCHAR(80) PRIMARY KEY, origin_station_id VARCHAR(30) NOT NULL, destination_station_id VARCHAR(30) NOT NULL,
    provider VARCHAR(40) NOT NULL, distance_km INTEGER NOT NULL, duration_minutes INTEGER NOT NULL,
    raw_duration_seconds INTEGER NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS booking_refunds (
    id BIGSERIAL PRIMARY KEY, booking_id VARCHAR(40) NOT NULL, amount DECIMAL(10,2) NOT NULL, reason VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'recorded', created_by BIGINT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS payment_banks (
    id BIGSERIAL PRIMARY KEY, bank_key VARCHAR(60) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, name_en VARCHAR(120) NULL,
    color CHAR(7) NOT NULL DEFAULT '#C4A94D', icon_url VARCHAR(500) NULL, bins_json TEXT NULL, enabled INTEGER NOT NULL DEFAULT 1,
    sort_order SMALLINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS content_versions (
    id BIGSERIAL PRIMARY KEY, version_name VARCHAR(120) NOT NULL, content_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', created_by BIGINT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ NULL)`,
  `CREATE TABLE IF NOT EXISTS archive_documents (
    document_key VARCHAR(40) PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS seat_holds (
    hold_id VARCHAR(40) PRIMARY KEY, session_id VARCHAR(80) NULL, trip_id VARCHAR(80) NOT NULL,
    seats_json TEXT NOT NULL DEFAULT '[]', expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS session_commands (
    id BIGSERIAL PRIMARY KEY, session_id VARCHAR(80) NOT NULL, command_type VARCHAR(40) NOT NULL, command_value VARCHAR(500) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, consumed_at TIMESTAMPTZ NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_search_session ON booking_searches(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_submission_created ON frontend_submissions(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_seen ON user_sessions(last_seen_at)`,
  `CREATE INDEX IF NOT EXISTS idx_trip_search ON managed_trips(origin_station_id,destination_station_id,departure_at,status)`,
  `CREATE INDEX IF NOT EXISTS idx_live_updated ON live_booking_sessions(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_geo_last_seen ON geo_visitors(last_seen_at)`,
  `CREATE INDEX IF NOT EXISTS idx_refund_booking ON booking_refunds(booking_id)`,
];

function quoteIdent(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error('Invalid identifier');
  return `"${value}"`;
}

async function seedRows(table: string, rows: Record<string, unknown>[], conflictColumn: string): Promise<void> {
  if (!rows.length) return;
  for (const row of rows) {
    const columns = Object.keys(row).filter(key => key !== 'id');
    const values = columns.map(key => row[key]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
    await dbExec(
      `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(',')}) VALUES (${placeholders}) ON CONFLICT (${quoteIdent(conflictColumn)}) DO NOTHING`,
      values,
    );
  }
}

async function seedDocuments(): Promise<void> {
  for (const key of ['stations', 'routes', 'cities', 'buses'] as ArchiveDocumentName[]) {
    const rows = await dbQuery<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM archive_documents WHERE document_key=$1) AS exists', [key]);
    if (!rows[0]?.exists) {
      await dbExec('INSERT INTO archive_documents(document_key,payload) VALUES($1,$2::jsonb)', [key, JSON.stringify(archiveSeedDocument(key))]);
    }
  }
}

async function seedDefaults(): Promise<void> {
  await seedRows('ui_settings', seedUiSettings(), 'setting_key');
  await seedRows('fare_pricing_rules', seedFarePricingRules(), 'fare_code');
  await seedRows('payment_banks', seedPaymentBanks(), 'bank_key');
  await seedRows('trusted_domains', seedTrustedDomains(), 'domain');
  await seedRows('channel_connectors', seedChannelConnectors(), 'channel_code');
  await seedRows('route_overrides', seedRouteOverrides(), 'route_key');
}

export async function ensureArchiveDatabase(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const statement of SCHEMA) await dbExec(statement);
      await seedDocuments();
      await seedDefaults();
    })().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export async function getArchiveDocument<T = Record<string, unknown>>(key: ArchiveDocumentName): Promise<T[]> {
  await ensureArchiveDatabase();
  const rows = await dbQuery<{ payload: T[] | string }>('SELECT payload FROM archive_documents WHERE document_key=$1', [key]);
  const payload = rows[0]?.payload;
  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

export async function setArchiveDocument(key: ArchiveDocumentName, value: unknown[]): Promise<void> {
  await ensureArchiveDatabase();
  await dbExec(
    `INSERT INTO archive_documents(document_key,payload,updated_at) VALUES($1,$2::jsonb,CURRENT_TIMESTAMP)
     ON CONFLICT(document_key) DO UPDATE SET payload=EXCLUDED.payload,updated_at=CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value)],
  );
}
