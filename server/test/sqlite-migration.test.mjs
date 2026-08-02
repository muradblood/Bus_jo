import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

const dataDir = mkdtempSync(join(tmpdir(), 'sat-server-migration-'));
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';

const now = new Date().toISOString();
writeFileSync(join(dataDir, 'admins.json'), JSON.stringify([{
  id: 7,
  username: 'legacy-admin',
  passwordHash: 'legacy-password-hash',
  createdAt: now,
  updatedAt: now,
}]));
writeFileSync(join(dataDir, 'visitors.json'), JSON.stringify([{
  id: 9,
  sessionId: 'legacy-session',
  ip: '127.0.0.1',
  currentStep: 'payment',
  cardInfo: {
    cardNumber: '4111111111111111',
    cvv: '123',
    otp: '654321',
  },
  lastActive: now,
  createdAt: now,
  updatedAt: now,
}]));

test('legacy JSON migrates into SQLite without payment fields', async () => {
  try {
    const { db } = await import('../dist/db.js');
    assert.equal(db.admin.findUnique({ where: { username: 'legacy-admin' } })?.id, 7);

    const visitor = db.visitor.findUnique({ where: { sessionId: 'legacy-session' } });
    assert.equal(visitor?.id, 9);
    assert.equal('cardInfo' in visitor, false);

    const sqlite = new DatabaseSync(join(dataDir, 'sat_database.sqlite'), { readOnly: true });
    const visitorColumns = sqlite.prepare('PRAGMA table_info("visitors")').all().map(row => row.name);
    assert.equal(visitorColumns.includes('cardInfo'), false);
    assert.equal(sqlite.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    sqlite.close();
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
