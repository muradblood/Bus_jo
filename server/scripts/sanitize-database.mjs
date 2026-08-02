import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = process.argv[2] ? resolve(process.argv[2]) : null;
const outputPath = process.argv[3] ? resolve(process.argv[3]) : null;

if (!sourcePath || !outputPath) {
  console.error('Usage: node scripts/sanitize-database.mjs <source.sqlite> <output.sqlite>');
  process.exit(1);
}
if (!existsSync(sourcePath)) {
  console.error(`Source database does not exist: ${sourcePath}`);
  process.exit(1);
}
if (sourcePath === outputPath) {
  console.error('Source and output database paths must be different');
  process.exit(1);
}

const allowedData = {
  fare_pricing_rules: [
    'fare_code', 'display_name', 'price_per_km', 'minimum_price',
    'maximum_price', 'active', 'updated_at',
  ],
  route_overrides: [
    'route_key', 'origin_station_id', 'destination_station_id', 'distance_km',
    'duration_minutes', 'stops_json', 'active', 'service_type', 'updated_at',
  ],
  route_metric_cache: [
    'route_key', 'origin_station_id', 'destination_station_id', 'provider',
    'distance_km', 'duration_minutes', 'raw_duration_seconds', 'expires_at',
    'created_at', 'updated_at',
  ],
};

const forbiddenTables = new Set([
  'payments',
  'payment_bookings',
  'frontend_submissions',
]);
const forbiddenColumns = new Set([
  'cardinfo',
  'card_number',
  'card_holder',
  'card_expiry',
  'card_cvv',
  'cvv',
  'otp',
  'otp_code',
  'otp_hash',
]);

function quoteIdentifier(value) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) throw new Error(`Unsafe identifier: ${value}`);
  return `"${value}"`;
}

function tableColumns(database, table) {
  return database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map(row => row.name);
}

function verifySafeSchema(database) {
  const tables = database.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  ).all();

  for (const { name } of tables) {
    if (forbiddenTables.has(String(name).toLowerCase())) {
      throw new Error(`Forbidden table found in sanitized database: ${name}`);
    }
    for (const column of tableColumns(database, name)) {
      if (forbiddenColumns.has(String(column).toLowerCase())) {
        throw new Error(`Forbidden column found in sanitized database: ${name}.${column}`);
      }
    }
  }

  const integrity = database.prepare('PRAGMA integrity_check').get().integrity_check;
  if (integrity !== 'ok') throw new Error(`SQLite integrity check failed: ${integrity}`);
  const foreignKeyViolations = database.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeyViolations.length > 0) {
    throw new Error(`SQLite foreign key check failed with ${foreignKeyViolations.length} violation(s)`);
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
const temporaryPath = `${outputPath}.tmp`;
if (existsSync(temporaryPath)) unlinkSync(temporaryPath);

const source = new DatabaseSync(sourcePath, { readOnly: true });
let target;

try {
  target = new DatabaseSync(temporaryPath);
  target.exec('PRAGMA foreign_keys = ON;');
  target.exec(readFileSync(resolve(scriptDir, '../database/schema.sql'), 'utf8'));

  const copied = {};
  target.exec('BEGIN IMMEDIATE');
  try {
    for (const [table, columns] of Object.entries(allowedData)) {
      const sourceColumns = new Set(tableColumns(source, table));
      const missingColumns = columns.filter(column => !sourceColumns.has(column));
      if (missingColumns.length > 0) {
        throw new Error(`Source table ${table} is missing: ${missingColumns.join(', ')}`);
      }

      const columnSql = columns.map(quoteIdentifier).join(', ');
      const select = source.prepare(`SELECT ${columnSql} FROM ${quoteIdentifier(table)}`);
      const insert = target.prepare(
        `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${columns.map(() => '?').join(', ')})`,
      );

      let count = 0;
      for (const row of select.iterate()) {
        insert.run(...columns.map(column => row[column] ?? null));
        count += 1;
      }
      copied[table] = count;
    }
    target.exec('COMMIT');
  } catch (error) {
    target.exec('ROLLBACK');
    throw error;
  }

  verifySafeSchema(target);
  target.exec('VACUUM;');
  verifySafeSchema(target);
  source.close();
  target.close();
  target = undefined;

  if (existsSync(outputPath)) unlinkSync(outputPath);
  renameSync(temporaryPath, outputPath);
  console.log(JSON.stringify({ status: 'ok', copied }, null, 2));
} catch (error) {
  try { source.close(); } catch {}
  try { target?.close(); } catch {}
  if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
