PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
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
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0, 1)),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  isRead INTEGER NOT NULL DEFAULT 0 CHECK (isRead IN (0, 1)),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prices (
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
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS banks (
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
);

CREATE TABLE IF NOT EXISTS visitors (
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
);

CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'السعودية',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  ip_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_bucket INTEGER NOT NULL,
  requests INTEGER NOT NULL DEFAULT 1,
  last_request_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ip_hash, endpoint, window_bucket)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_code TEXT NOT NULL,
  severity TEXT NOT NULL,
  component TEXT NOT NULL,
  request_path TEXT,
  ip_address TEXT,
  session_id TEXT,
  message TEXT NOT NULL,
  context_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fare_pricing_rules (
  fare_code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  price_per_km REAL NOT NULL,
  minimum_price REAL NOT NULL,
  maximum_price REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS route_overrides (
  route_key TEXT PRIMARY KEY,
  origin_station_id TEXT NOT NULL,
  destination_station_id TEXT NOT NULL,
  distance_km INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  stops_json TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  service_type TEXT NOT NULL DEFAULT 'domestic',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS route_metric_cache (
  route_key TEXT PRIMARY KEY,
  origin_station_id TEXT NOT NULL,
  destination_station_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  distance_km INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  raw_duration_seconds INTEGER,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS managed_trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_code TEXT NOT NULL UNIQUE,
  origin_station_id TEXT NOT NULL,
  destination_station_id TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'domestic',
  departure_at TEXT NOT NULL,
  arrival_at TEXT NOT NULL,
  bus_label TEXT NOT NULL,
  seat_capacity INTEGER NOT NULL DEFAULT 45,
  saver_price REAL NOT NULL,
  standard_price REAL NOT NULL,
  flex_price REAL NOT NULL,
  vip_price REAL NOT NULL,
  stops_json TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recorded',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_value TEXT,
  channels_json TEXT NOT NULL DEFAULT '["socket"]',
  scheduled_at TEXT NOT NULL,
  sent_at TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS geo_ip_cache (
  ip_hash TEXT PRIMARY KEY,
  country_code TEXT,
  country_name TEXT,
  provider TEXT NOT NULL,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expiresAt);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(paymentStatus);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_prices_route ON prices(fromCity, toCity);
CREATE INDEX IF NOT EXISTS idx_visitors_seen ON visitors(lastActive DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_blocked ON visitors(isBlocked);
CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup ON api_rate_limits(window_bucket);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_metric_expires ON route_metric_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_route_metric_pair ON route_metric_cache(origin_station_id, destination_station_id);
CREATE INDEX IF NOT EXISTS idx_route_override_pair ON route_overrides(origin_station_id, destination_station_id, active);
CREATE INDEX IF NOT EXISTS idx_managed_trip_search ON managed_trips(origin_station_id, destination_station_id, departure_at, status);
CREATE INDEX IF NOT EXISTS idx_refund_booking ON booking_refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_due ON scheduled_notifications(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_geo_cache_expiry ON geo_ip_cache(expires_at);
