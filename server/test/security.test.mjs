import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { io } from 'socket.io-client';

const dataDir = mkdtempSync(join(tmpdir(), 'sat-server-security-'));
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';
process.env.ADMIN_USERNAME = 'security_admin';
process.env.ADMIN_PASSWORD = 'SecurityPass123!';
process.env.SESSION_SECRET = 'security-test-session-secret-32-characters';

const { createApp, createSessionMiddleware } = await import('../dist/app.js');
const { initSocketIO } = await import('../dist/socket.js');

let cookie = '';

function connectSocket(baseUrl, requestCookie) {
  return new Promise((resolve) => {
    const socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 2_000,
      ...(requestCookie ? { extraHeaders: { Cookie: requestCookie } } : {}),
    });
    const timer = setTimeout(() => {
      socket.close();
      resolve({ connected: false, error: 'timeout' });
    }, 3_000);
    socket.on('connect', () => {
      clearTimeout(timer);
      socket.close();
      resolve({ connected: true });
    });
    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      socket.close();
      resolve({ connected: false, error: error.message });
    });
  });
}

function openSocket(baseUrl, requestCookie) {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 2_000,
      extraHeaders: { Cookie: requestCookie },
    });
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('admin socket connection timeout'));
    }, 3_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      socket.close();
      reject(error);
    });
  });
}

test('admin authorization and public input security boundaries', async () => {
  const sessionMiddleware = createSessionMiddleware();
  const httpServer = createServer(createApp(sessionMiddleware));
  initSocketIO(httpServer, sessionMiddleware);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function call(path, { method = 'GET', input, auth = false, headers = {} } = {}) {
    const requestHeaders = { ...headers };
    if (method !== 'GET') requestHeaders['content-type'] = 'application/json';
    if (auth && cookie) requestHeaders.cookie = cookie;
    let url = `${baseUrl}/api/trpc/${path}`;
    if (method === 'GET' && input !== undefined) {
      url += `?input=${encodeURIComponent(JSON.stringify(input))}`;
    }
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      ...(method !== 'GET' ? { body: JSON.stringify(input ?? {}) } : {}),
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const body = await response.json();
    return { status: response.status, data: body?.result?.data, body };
  }

  try {
    for (const path of [
      'admin.stats', 'admin.bookings', 'bookings.list', 'banks.list',
      'prices.catalog', 'settings.list', 'visitors.list', 'visitors.stats',
    ]) {
      assert.equal((await call(path)).status, 401, `${path} must require an admin session`);
    }

    const anonymousSocket = await connectSocket(baseUrl);
    assert.equal(anonymousSocket.connected, false);
    assert.equal(anonymousSocket.error, 'Unauthorized');

    const login = await call('auth.login', {
      method: 'POST',
      input: { username: 'security_admin', password: 'SecurityPass123!' },
    });
    assert.equal(login.status, 200);
    assert.ok(cookie.startsWith('connect.sid='));
    assert.equal((await call('admin.stats', { auth: true })).status, 200);

    const adminSocket = await connectSocket(baseUrl, cookie);
    assert.equal(adminSocket.connected, true);

    const beforePrices = await call('prices.list', { auth: true });
    assert.equal(beforePrices.data.length, 0);
    assert.equal((await call('prices.calculate', {
      input: { from: 'مدينة تجريبية أ', to: 'مدينة تجريبية ب' },
    })).status, 200);
    const afterPrices = await call('prices.list', { auth: true });
    assert.equal(afterPrices.data.length, 0, 'public price calculation must not persist data');

    const negativePrice = await call('prices.upsert', {
      method: 'POST',
      auth: true,
      input: {
        fromCity: 'الرياض', toCity: 'جدة', distance: -1, duration: -1,
        economyPrice: -1, businessPrice: -1, vipPrice: -1, borderCrossings: [],
      },
    });
    assert.equal(negativePrice.status, 400);

    assert.equal((await call('cities.create', {
      method: 'POST', auth: true,
      input: { name: 'مدينة إحداثية أ', region: 'اختبار', country: 'اختبار', lat: 24.7136, lng: 46.6753 },
    })).status, 200);
    assert.equal((await call('cities.create', {
      method: 'POST', auth: true,
      input: { name: 'مدينة إحداثية ب', region: 'اختبار', country: 'اختبار', lat: 21.5433, lng: 39.1728 },
    })).status, 200);
    const generatedFromCoordinates = await call('prices.calculate', {
      input: { from: 'مدينة إحداثية أ', to: 'مدينة إحداثية ب' },
    });
    assert.equal(generatedFromCoordinates.status, 200);
    assert.equal(generatedFromCoordinates.data.generated, true);
    assert.ok(generatedFromCoordinates.data.distance > 500);
    assert.ok(generatedFromCoordinates.data.duration > 1);

    assert.equal((await call('visitors.track', {
      method: 'POST',
      input: {
        sessionId: 'security-visitor', page: '/', userAgent: 'security-test',
        ip: '203.0.113.9', step: 'home',
      },
    })).status, 200);
    const visitors = await call('visitors.list', { auth: true });
    assert.equal(visitors.data[0].sessionId, 'security-visitor');
    assert.notEqual(visitors.data[0].ip, '203.0.113.9', 'client-supplied IP must be ignored');
    assert.equal('cardInfo' in visitors.data[0], false, 'visitor records must not expose payment details');

    const unsafeRedirect = await call('visitors.setRedirectUrl', {
      method: 'POST',
      auth: true,
      input: { sessionId: 'security-visitor', redirectUrl: 'javascript:alert(1)' },
    });
    assert.equal(unsafeRedirect.status, 400);
    assert.equal((await call('visitors.setRedirectUrl', {
      method: 'POST',
      auth: true,
      input: { sessionId: 'security-visitor', redirectUrl: 'step:payment_method' },
    })).status, 200);

    const booking = await call('bookings.create', {
      method: 'POST',
      input: {
        tripType: 'one-way', fromLocation: 'الرياض', toLocation: 'جدة',
        pickupDate: '2030-01-01', pickupTime: '10:00', passengers: 1,
        adults: 1, children: 0, infants: 0,
      },
    });
    assert.equal(booking.status, 200);

    const realtimeSocket = await openSocket(baseUrl, cookie);
    const bookingUpdateEvent = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('booking_updated event timeout')), 3_000);
      realtimeSocket.once('booking_updated', (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
    const bookingDetails = {
      id: booking.data.id,
      accessToken: booking.data.accessToken,
      selectedFare: 'economy',
      passengerName: 'مسافر تجريبي',
      passengerPhone: '+966500000000',
      passengerDocument: 'DOC-123456',
      totalAmount: 1,
    };
    const updatedBooking = await call('bookings.updateStep', {
      method: 'POST',
      input: bookingDetails,
    });
    assert.equal(updatedBooking.status, 200);
    assert.equal(updatedBooking.data.passengerName, bookingDetails.passengerName);
    assert.equal(updatedBooking.data.passengerPhone, bookingDetails.passengerPhone);
    assert.equal(updatedBooking.data.passengerDocument, bookingDetails.passengerDocument);
    assert.ok(updatedBooking.data.totalAmount > 0);

    const realtimeBooking = await bookingUpdateEvent;
    realtimeSocket.close();
    assert.equal(realtimeBooking.id, booking.data.id);
    assert.equal(realtimeBooking.passengerDocument, bookingDetails.passengerDocument);

    const persistedBookings = await call('admin.bookings', { auth: true });
    const persistedBooking = persistedBookings.data.find(item => item.id === booking.data.id);
    assert.equal(persistedBooking.passengerName, bookingDetails.passengerName);
    assert.equal(persistedBooking.passengerPhone, bookingDetails.passengerPhone);
    assert.equal(persistedBooking.passengerDocument, bookingDetails.passengerDocument);
    assert.equal(persistedBooking.pickupDate, '2030-01-01');
    assert.ok(persistedBooking.totalAmount > 0);

    const invalidStatus = await call('admin.updateBookingStatus', {
      method: 'POST',
      auth: true,
      input: { id: booking.data.id, status: 'unexpected-status' },
    });
    assert.equal(invalidStatus.status, 400);

    const crossSiteNotification = await fetch(`${baseUrl}/api/notifications/booking`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://attacker.example',
        'sec-fetch-site': 'cross-site',
      },
      body: JSON.stringify({ event: 'visitor-enter', page: '/' }),
    });
    assert.equal(crossSiteNotification.status, 403);

    const sensitivePaymentPayload = await fetch(`${baseUrl}/api/notifications/payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status: 'verification_submitted', amount: 100, attemptNumber: 1,
        cardNumber: '4111111111111111', cvv: '123', otp: '123456',
      }),
    });
    assert.equal(sensitivePaymentPayload.status, 400, 'payment endpoint must reject card, CVV, and OTP fields');

    const statusOnlyPaymentPayload = await fetch(`${baseUrl}/api/notifications/payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'filled_in' }),
    });
    assert.equal(statusOnlyPaymentPayload.status, 200);
    assert.equal(existsSync(join(dataDir, 'payments.json')), false, 'payment status events must not be stored');

    const sqlite = new DatabaseSync(join(dataDir, 'sat_database.sqlite'), { readOnly: true });
    const sqliteTables = sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    ).all().map(row => String(row.name));
    for (const forbiddenTable of ['payments', 'payment_bookings', 'frontend_submissions']) {
      assert.equal(sqliteTables.includes(forbiddenTable), false, `${forbiddenTable} must not exist`);
    }
    for (const table of sqliteTables) {
      const columns = sqlite.prepare(`PRAGMA table_info(\"${table}\")`).all().map(row => String(row.name).toLowerCase());
      for (const forbiddenColumn of ['cardinfo', 'card_number', 'card_cvv', 'cvv', 'otp', 'otp_code']) {
        assert.equal(columns.includes(forbiddenColumn), false, `${table}.${forbiddenColumn} must not exist`);
      }
    }
    assert.equal(sqlite.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
    sqlite.close();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal((await call('auth.login', {
        method: 'POST',
        input: { username: 'security_admin', password: 'incorrect-password' },
      })).status, 401);
    }
    assert.equal((await call('auth.login', {
      method: 'POST',
      input: { username: 'security_admin', password: 'incorrect-password' },
    })).status, 429);

    assert.equal((await call('auth.logout', { method: 'POST', auth: true })).status, 200);
    assert.equal((await call('admin.stats', { auth: true })).status, 401);

    const previousNodeEnv = process.env.NODE_ENV;
    const previousSecret = process.env.SESSION_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    assert.throws(() => createSessionMiddleware(), /SESSION_SECRET/);
    process.env.NODE_ENV = previousNodeEnv;
    process.env.SESSION_SECRET = previousSecret;
  } finally {
    await new Promise((resolve, reject) => {
      httpServer.close(error => error ? reject(error) : resolve());
    });
    rmSync(dataDir, { recursive: true, force: true });
  }
});
