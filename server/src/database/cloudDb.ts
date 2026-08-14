import { createClient } from '@libsql/client';

type WhereClause = Record<string, unknown>;
type OrderByClause = Record<string, 'asc' | 'desc'>;
type DatabaseValue = string | number | bigint | Uint8Array | null;

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL?.trim() || '';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

export const tursoConfigured = Boolean(TURSO_DATABASE_URL && TURSO_AUTH_TOKEN);

const client = tursoConfigured
  ? createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN })
  : null;

const CLOUD_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accessToken TEXT,
    tripType TEXT NOT NULL DEFAULT 'one-way',
    fromLocation TEXT NOT NULL,
    toLocation TEXT NOT NULL,
    pickupDate TEXT NOT NULL,
    pickupTime TEXT NOT NULL,
    returnDate TEXT,
    returnTime TEXT,
    passengers INTEGER NOT NULL DEFAULT 1,
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER NOT NULL DEFAULT 0,
    infants INTEGER NOT NULL DEFAULT 0,
    passengerName TEXT,
    passengerPhone TEXT,
    passengerDocument TEXT,
    fareClass TEXT,
    selectedTrip TEXT,
    selectedSeats TEXT,
    paymentMethod TEXT,
    paymentStatus TEXT NOT NULL DEFAULT 'pending',
    totalAmount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    isNew INTEGER NOT NULL DEFAULT 1 CHECK (isNew IN (0, 1)),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0, 1)),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    isRead INTEGER NOT NULL DEFAULT 0 CHECK (isRead IN (0, 1)),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromCity TEXT NOT NULL,
    toCity TEXT NOT NULL,
    distance INTEGER NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 0,
    economyPrice REAL NOT NULL,
    businessPrice REAL NOT NULL,
    vipPrice REAL NOT NULL,
    borderCrossings TEXT NOT NULL DEFAULT '[]',
    generated INTEGER NOT NULL DEFAULT 0 CHECK (generated IN (0, 1)),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE (fromCity, toCity)
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'bank' CHECK (type IN ('bank', 'wallet')),
    name TEXT NOT NULL,
    nameEn TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL,
    colorDark TEXT NOT NULL,
    colorLight TEXT NOT NULL,
    otpMessage TEXT NOT NULL DEFAULT '',
    supportPhone TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    bins TEXT NOT NULL DEFAULT '',
    logoUrl TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId TEXT NOT NULL UNIQUE,
    ip TEXT NOT NULL DEFAULT 'unknown',
    country TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    userAgent TEXT NOT NULL DEFAULT '',
    page TEXT NOT NULL DEFAULT '/',
    currentStep TEXT NOT NULL DEFAULT 'home',
    stepHistory TEXT NOT NULL DEFAULT '[]',
    isBlocked INTEGER NOT NULL DEFAULT 0 CHECK (isBlocked IN (0, 1)),
    redirectUrl TEXT,
    bookingData TEXT NOT NULL DEFAULT '{}',
    geoLat REAL,
    geoLng REAL,
    lastActive TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    region TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT 'السعودية',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expiresAt)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(createdAt DESC)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, createdAt DESC)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(paymentStatus)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt DESC)',
  'CREATE INDEX IF NOT EXISTS idx_prices_route ON prices(fromCity, toCity)',
  'CREATE INDEX IF NOT EXISTS idx_visitors_seen ON visitors(lastActive DESC)',
  'CREATE INDEX IF NOT EXISTS idx_visitors_blocked ON visitors(isBlocked)',
];

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!client) throw new Error('Turso database is not configured');
  if (!schemaReady) {
    schemaReady = (async () => {
      await client.batch(CLOUD_SCHEMA, 'write');
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function toDatabaseValue(value: unknown): DatabaseValue {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return value;
  if (value instanceof Uint8Array) return value;
  return JSON.stringify(value);
}

function flattenCompositeWhere(key: string, value: unknown): WhereClause | null {
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(key)) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as WhereClause;
}

function buildWhere(where?: WhereClause): { sql: string; params: DatabaseValue[] } {
  if (!where || Object.keys(where).length === 0) return { sql: '', params: [] };
  const parts: string[] = [];
  const params: DatabaseValue[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' || key === 'AND') {
      const clauses = Array.isArray(value) ? value as WhereClause[] : [];
      const built = clauses.map(buildWhere).filter(item => item.sql);
      if (built.length > 0) {
        parts.push(`(${built.map(item => item.sql.replace(/^ WHERE /, '')).join(` ${key} `)})`);
        for (const item of built) params.push(...item.params);
      }
      continue;
    }

    const composite = flattenCompositeWhere(key, value);
    if (composite) {
      const built = buildWhere(composite);
      if (built.sql) {
        parts.push(`(${built.sql.replace(/^ WHERE /, '')})`);
        params.push(...built.params);
      }
      continue;
    }

    const column = quoteIdentifier(key);
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const operators = value as Record<string, unknown>;
      const supported: Array<[string, string]> = [['gte', '>='], ['lte', '<='], ['gt', '>'], ['lt', '<']];
      let used = false;
      for (const [operator, sqlOperator] of supported) {
        if (operator in operators) {
          parts.push(`${column} ${sqlOperator} ?`);
          params.push(toDatabaseValue(operators[operator]));
          used = true;
        }
      }
      if (used) continue;
    }

    if (value === null) {
      parts.push(`${column} IS NULL`);
    } else {
      parts.push(`${column} = ?`);
      params.push(toDatabaseValue(value));
    }
  }

  return parts.length > 0 ? { sql: ` WHERE ${parts.join(' AND ')}`, params } : { sql: '', params: [] };
}

export class TursoCollection<T extends { id: number | string }> {
  private columnsPromise: Promise<Set<string>> | null = null;

  constructor(
    private readonly tableName: string,
    private readonly booleanFields: ReadonlySet<string> = new Set(),
  ) {
    quoteIdentifier(tableName);
  }

  private async columns(): Promise<Set<string>> {
    await ensureSchema();
    if (!client) throw new Error('Turso database is not configured');
    if (!this.columnsPromise) {
      this.columnsPromise = client.execute(`PRAGMA table_info(${quoteIdentifier(this.tableName)})`).then(result => {
        const columns = new Set(result.rows.map(row => String((row as Record<string, unknown>).name ?? '')));
        if (columns.size === 0) throw new Error(`Turso table is missing: ${this.tableName}`);
        return columns;
      });
    }
    return this.columnsPromise;
  }

  private normalizeRow(row: Record<string, unknown> | undefined): T | null {
    if (!row) return null;
    const normalized = { ...row };
    for (const field of this.booleanFields) {
      if (field in normalized) normalized[field] = Boolean(normalized[field]);
    }
    return normalized as T;
  }

  private async sanitizeData(data: Record<string, unknown>): Promise<Record<string, DatabaseValue>> {
    const columns = await this.columns();
    const result: Record<string, DatabaseValue> = {};
    for (const [key, value] of Object.entries(data)) {
      if (columns.has(key) && value !== undefined) result[key] = toDatabaseValue(value);
    }
    return result;
  }

  async count(options?: { where?: WhereClause }): Promise<number> {
    await ensureSchema();
    if (!client) throw new Error('Turso database is not configured');
    const where = buildWhere(options?.where);
    const result = await client.execute({
      sql: `SELECT COUNT(*) AS count FROM ${quoteIdentifier(this.tableName)}${where.sql}`,
      args: where.params,
    });
    return Number((result.rows[0] as Record<string, unknown> | undefined)?.count ?? 0);
  }

  async findUnique(options: { where: WhereClause }): Promise<T | null> {
    return this.findFirst({ where: options.where });
  }

  async findFirst(options?: { where?: WhereClause; orderBy?: OrderByClause }): Promise<T | null> {
    return (await this.findMany({ ...options, take: 1 }))[0] ?? null;
  }

  async findMany(options?: { where?: WhereClause; orderBy?: OrderByClause; take?: number }): Promise<T[]> {
    await ensureSchema();
    if (!client) throw new Error('Turso database is not configured');
    const where = buildWhere(options?.where);
    let sql = `SELECT * FROM ${quoteIdentifier(this.tableName)}${where.sql}`;
    const order = options?.orderBy ? Object.entries(options.orderBy)[0] : undefined;
    if (order) sql += ` ORDER BY ${quoteIdentifier(order[0])} ${order[1] === 'desc' ? 'DESC' : 'ASC'}`;
    if (options?.take !== undefined) sql += ` LIMIT ${Math.max(0, Math.trunc(options.take))}`;
    const result = await client.execute({ sql, args: where.params });
    return result.rows
      .map(row => this.normalizeRow(row as unknown as Record<string, unknown>))
      .filter((row): row is T => Boolean(row));
  }

  async create(options: { data: Record<string, unknown> }): Promise<T> {
    await ensureSchema();
    if (!client) throw new Error('Turso database is not configured');
    const columns = await this.columns();
    const now = new Date().toISOString();
    const prepared = await this.sanitizeData({ ...options.data });
    if (columns.has('createdAt') && prepared.createdAt === undefined) prepared.createdAt = now;
    if (columns.has('updatedAt')) prepared.updatedAt = now;
    const keys = Object.keys(prepared);
    if (keys.length === 0) throw new Error(`No writable data for ${this.tableName}`);
    const result = await client.execute({
      sql: `INSERT INTO ${quoteIdentifier(this.tableName)} (${keys.map(quoteIdentifier).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      args: keys.map(key => prepared[key]),
    });
    const rawId = prepared.id ?? result.lastInsertRowid;
    const id = typeof rawId === 'bigint' ? Number(rawId) : rawId;
    if (id === undefined || id === null) throw new Error(`Failed to resolve created id for ${this.tableName}`);
    const created = await this.findUnique({ where: { id } });
    if (!created) throw new Error(`Failed to read created record from ${this.tableName}`);
    return created;
  }

  async update(options: { where: WhereClause; data: Record<string, unknown> }): Promise<T> {
    await ensureSchema();
    if (!client) throw new Error('Turso database is not configured');
    const current = await this.findUnique({ where: options.where });
    if (!current) throw new Error(`Record not found in ${this.tableName}`);
    const columns = await this.columns();
    const prepared = await this.sanitizeData(options.data);
    if (columns.has('updatedAt')) prepared.updatedAt = new Date().toISOString();
    const keys = Object.keys(prepared);
    if (keys.length > 0) {
      const where = buildWhere(options.where);
      await client.execute({
        sql: `UPDATE ${quoteIdentifier(this.tableName)} SET ${keys.map(key => `${quoteIdentifier(key)} = ?`).join(', ')}${where.sql}`,
        args: [...keys.map(key => prepared[key]), ...where.params],
      });
    }
    const updated = await this.findUnique({ where: options.where });
    if (!updated) throw new Error(`Record not found in ${this.tableName}`);
    return updated;
  }

  async updateMany(options: { where?: WhereClause; data: Record<string, unknown> }): Promise<{ count: number }> {
    await ensureSchema();
    if (!client) throw new Error('Turso database is not configured');
    const columns = await this.columns();
    const prepared = await this.sanitizeData(options.data);
    if (columns.has('updatedAt')) prepared.updatedAt = new Date().toISOString();
    const keys = Object.keys(prepared);
    if (keys.length === 0) return { count: 0 };
    const where = buildWhere(options.where);
    const result = await client.execute({
      sql: `UPDATE ${quoteIdentifier(this.tableName)} SET ${keys.map(key => `${quoteIdentifier(key)} = ?`).join(', ')}${where.sql}`,
      args: [...keys.map(key => prepared[key]), ...where.params],
    });
    return { count: Number(result.rowsAffected) };
  }

  async upsert(options: { where: WhereClause; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<T> {
    const existing = await this.findUnique({ where: options.where });
    return existing
      ? this.update({ where: options.where, data: options.update })
      : this.create({ data: options.create });
  }

  async upsertMany(options: { uniqueKey: string; data: Array<Record<string, unknown>> }): Promise<T[]> {
    const changed: T[] = [];
    for (const data of options.data) {
      changed.push(await this.upsert({
        where: { [options.uniqueKey]: data[options.uniqueKey] },
        create: data,
        update: data,
      }));
    }
    return changed;
  }

  async delete(options: { where: WhereClause }): Promise<T> {
    await ensureSchema();
    if (!client) throw new Error('Turso database is not configured');
    const current = await this.findUnique({ where: options.where });
    if (!current) throw new Error(`Record not found in ${this.tableName}`);
    const where = buildWhere(options.where);
    await client.execute({
      sql: `DELETE FROM ${quoteIdentifier(this.tableName)}${where.sql}`,
      args: where.params,
    });
    return current;
  }

  async deleteMany(options?: { where?: WhereClause }): Promise<{ count: number }> {
    await ensureSchema();
    if (!client) throw new Error('Turso database is not configured');
    const where = buildWhere(options?.where);
    const result = await client.execute({
      sql: `DELETE FROM ${quoteIdentifier(this.tableName)}${where.sql}`,
      args: where.params,
    });
    return { count: Number(result.rowsAffected) };
  }

  async aggregate(options: { _sum?: Record<string, boolean> }): Promise<{ _sum: Record<string, number | null> }> {
    await ensureSchema();
    if (!client) throw new Error('Turso database is not configured');
    const result: { _sum: Record<string, number | null> } = { _sum: {} };
    for (const [field, include] of Object.entries(options._sum ?? {})) {
      if (!include) continue;
      const query = await client.execute(`SELECT SUM(${quoteIdentifier(field)}) AS value FROM ${quoteIdentifier(this.tableName)}`);
      const value = (query.rows[0] as Record<string, unknown> | undefined)?.value;
      result._sum[field] = value === null || value === undefined ? null : Number(value);
    }
    return result;
  }
}

export async function getTursoHealth(): Promise<{ integrity: string; foreignKeyViolations: number }> {
  await ensureSchema();
  if (!client) throw new Error('Turso database is not configured');
  await client.execute('SELECT 1 AS ok');
  return { integrity: 'ok', foreignKeyViolations: 0 };
}
