import { existsSync, mkdirSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { gunzipSync } from 'node:zlib';

type WhereClause = Record<string, unknown>;
type OrderByClause = Record<string, 'asc' | 'desc'>;

const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : process.env.VERCEL
    ? '/tmp/bus_jo_data'
    : join(process.cwd(), 'data');

const DATABASE_PATH = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : join(DATA_DIR, 'sat_database.sqlite');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function findDatabaseAsset(name: string): string | null {
  const candidates = [
    join(process.cwd(), 'database', name),
    join(process.cwd(), 'server', 'database', name),
  ];
  return candidates.find(existsSync) ?? null;
}

function openDatabase(): DatabaseSync {
  ensureDataDir();
  if (!existsSync(DATABASE_PATH) && process.env.NODE_ENV !== 'test') {
    const seed = findDatabaseAsset('sat_database.sqlite');
    if (seed) {
      copyFileSync(seed, DATABASE_PATH);
    } else {
      const compressedSeed = findDatabaseAsset('sat_database.sqlite.gz');
      if (compressedSeed) writeFileSync(DATABASE_PATH, gunzipSync(readFileSync(compressedSeed)));
    }
  }

  const database = new DatabaseSync(DATABASE_PATH);
  database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (DATABASE_PATH !== ':memory:') {
    database.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
  }
  const schemaPath = findDatabaseAsset('schema.sql');
  if (!schemaPath) throw new Error('SQLite schema asset is missing');
  database.exec(readFileSync(schemaPath, 'utf8'));
  return database;
}

const database = openDatabase();

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(identifier)) {
    throw new Error(`Unsafe SQLite identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function toDatabaseValue(value: unknown): SQLInputValue {
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

function buildWhere(where?: WhereClause): { sql: string; params: SQLInputValue[] } {
  if (!where || Object.keys(where).length === 0) return { sql: '', params: [] };
  const parts: string[] = [];
  const params: SQLInputValue[] = [];

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

export class SqliteCollection<T extends { id: number | string }> {
  private readonly columns: Set<string>;

  constructor(
    private readonly tableName: string,
    private readonly booleanFields: ReadonlySet<string> = new Set(),
  ) {
    quoteIdentifier(tableName);
    const rows = database.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all() as Array<{ name: string }>;
    this.columns = new Set(rows.map(row => row.name));
    if (this.columns.size === 0) throw new Error(`SQLite table is missing: ${tableName}`);
    this.migrateLegacyJson();
  }

  private normalizeRow(row: Record<string, unknown> | undefined): T | null {
    if (!row) return null;
    const normalized = { ...row };
    for (const field of this.booleanFields) {
      if (field in normalized) normalized[field] = Boolean(normalized[field]);
    }
    return normalized as T;
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, SQLInputValue> {
    const result: Record<string, SQLInputValue> = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.columns.has(key) && value !== undefined) result[key] = toDatabaseValue(value);
    }
    return result;
  }

  private migrateLegacyJson(): void {
    const legacyFile = join(DATA_DIR, `${this.tableName}.json`);
    if (!existsSync(legacyFile) || this.count() > 0) return;
    try {
      const parsed = JSON.parse(readFileSync(legacyFile, 'utf8'));
      if (!Array.isArray(parsed)) return;
      database.exec('BEGIN IMMEDIATE');
      try {
        for (const item of parsed) {
          if (item && typeof item === 'object' && !Array.isArray(item)) this.create({ data: item });
        }
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error(`[sqlite] failed to migrate ${this.tableName}.json`, error);
    }
  }

  count(options?: { where?: WhereClause }): number {
    const where = buildWhere(options?.where);
    const row = database.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(this.tableName)}${where.sql}`).get(...where.params) as { count: number };
    return Number(row.count);
  }

  findUnique(options: { where: WhereClause }): T | null {
    return this.findFirst({ where: options.where });
  }

  findFirst(options?: { where?: WhereClause; orderBy?: OrderByClause }): T | null {
    return this.findMany({ ...options, take: 1 })[0] ?? null;
  }

  findMany(options?: { where?: WhereClause; orderBy?: OrderByClause; take?: number }): T[] {
    const where = buildWhere(options?.where);
    let sql = `SELECT * FROM ${quoteIdentifier(this.tableName)}${where.sql}`;
    const order = options?.orderBy ? Object.entries(options.orderBy)[0] : undefined;
    if (order) sql += ` ORDER BY ${quoteIdentifier(order[0])} ${order[1] === 'desc' ? 'DESC' : 'ASC'}`;
    if (options?.take !== undefined) sql += ` LIMIT ${Math.max(0, Math.trunc(options.take))}`;
    const rows = database.prepare(sql).all(...where.params) as Array<Record<string, unknown>>;
    return rows.map(row => this.normalizeRow(row)!).filter(Boolean);
  }

  create(options: { data: Record<string, unknown> }): T {
    const now = new Date().toISOString();
    const prepared = this.sanitizeData({ ...options.data });
    if (this.columns.has('createdAt') && prepared.createdAt === undefined) prepared.createdAt = now;
    if (this.columns.has('updatedAt')) prepared.updatedAt = now;
    const keys = Object.keys(prepared);
    if (keys.length === 0) throw new Error(`No writable data for ${this.tableName}`);
    const values = keys.map(key => prepared[key]);
    const sql = `INSERT INTO ${quoteIdentifier(this.tableName)} (${keys.map(quoteIdentifier).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    const result = database.prepare(sql).run(...values);
    const id = prepared.id ?? result.lastInsertRowid;
    const created = this.findUnique({ where: { id: typeof id === 'bigint' ? Number(id) : id } });
    if (!created) throw new Error(`Failed to read created record from ${this.tableName}`);
    return created;
  }

  update(options: { where: WhereClause; data: Record<string, unknown> }): T {
    const current = this.findUnique({ where: options.where });
    if (!current) throw new Error(`Record not found in ${this.tableName}`);
    const prepared = this.sanitizeData(options.data);
    if (this.columns.has('updatedAt')) prepared.updatedAt = new Date().toISOString();
    const keys = Object.keys(prepared);
    if (keys.length > 0) {
      const where = buildWhere(options.where);
      database.prepare(`UPDATE ${quoteIdentifier(this.tableName)} SET ${keys.map(key => `${quoteIdentifier(key)} = ?`).join(', ')}${where.sql}`).run(...keys.map(key => prepared[key]), ...where.params);
    }
    const updated = this.findUnique({ where: options.where });
    if (!updated) throw new Error(`Record not found in ${this.tableName}`);
    return updated;
  }

  updateMany(options: { where?: WhereClause; data: Record<string, unknown> }): { count: number } {
    const prepared = this.sanitizeData(options.data);
    if (this.columns.has('updatedAt')) prepared.updatedAt = new Date().toISOString();
    const keys = Object.keys(prepared);
    if (keys.length === 0) return { count: 0 };
    const where = buildWhere(options.where);
    const result = database.prepare(`UPDATE ${quoteIdentifier(this.tableName)} SET ${keys.map(key => `${quoteIdentifier(key)} = ?`).join(', ')}${where.sql}`).run(...keys.map(key => prepared[key]), ...where.params);
    return { count: Number(result.changes) };
  }

  upsert(options: { where: WhereClause; create: Record<string, unknown>; update: Record<string, unknown> }): T {
    const existing = this.findUnique({ where: options.where });
    return existing ? this.update({ where: options.where, data: options.update }) : this.create({ data: options.create });
  }

  upsertMany(options: { uniqueKey: string; data: Array<Record<string, unknown>> }): T[] {
    const changed: T[] = [];
    database.exec('BEGIN IMMEDIATE');
    try {
      for (const data of options.data) {
        changed.push(this.upsert({
          where: { [options.uniqueKey]: data[options.uniqueKey] },
          create: data,
          update: data,
        }));
      }
      database.exec('COMMIT');
      return changed;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  delete(options: { where: WhereClause }): T {
    const current = this.findUnique({ where: options.where });
    if (!current) throw new Error(`Record not found in ${this.tableName}`);
    const where = buildWhere(options.where);
    database.prepare(`DELETE FROM ${quoteIdentifier(this.tableName)}${where.sql}`).run(...where.params);
    return current;
  }

  deleteMany(options?: { where?: WhereClause }): { count: number } {
    const where = buildWhere(options?.where);
    const result = database.prepare(`DELETE FROM ${quoteIdentifier(this.tableName)}${where.sql}`).run(...where.params);
    return { count: Number(result.changes) };
  }

  aggregate(options: { _sum?: Record<string, boolean> }): { _sum: Record<string, number | null> } {
    const result: { _sum: Record<string, number | null> } = { _sum: {} };
    for (const [field, include] of Object.entries(options._sum ?? {})) {
      if (!include) continue;
      const row = database.prepare(`SELECT SUM(${quoteIdentifier(field)}) AS value FROM ${quoteIdentifier(this.tableName)}`).get() as { value: number | null };
      result._sum[field] = row.value === null ? null : Number(row.value);
    }
    return result;
  }
}

export function getDatabaseHealth(): { path: string; integrity: string; foreignKeyViolations: number } {
  const integrity = database.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
  const violations = database.prepare('PRAGMA foreign_key_check').all();
  return { path: DATABASE_PATH, integrity: integrity.integrity_check, foreignKeyViolations: violations.length };
}
