import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

const dataDir = mkdtempSync(join(tmpdir(), 'sat-server-seed-'));
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = 'production';

test('compressed sanitized seed initializes the production database', async () => {
  try {
    const { getDatabaseHealth } = await import('../dist/sqliteDb.js');
    const health = getDatabaseHealth();
    assert.equal(health.integrity, 'ok');
    assert.equal(health.foreignKeyViolations, 0);

    const sqlite = new DatabaseSync(join(dataDir, 'sat_database.sqlite'), { readOnly: true });
    assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM fare_pricing_rules').get().count, 4);
    assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM route_overrides').get().count, 732);
    assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM route_metric_cache').get().count, 37344);
    assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM bookings').get().count, 0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM visitors').get().count, 0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM admins').get().count, 0);
    sqlite.close();
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
