import { SqliteCollection } from './sqliteDb.js';
import { TursoCollection, tursoConfigured } from './cloudDb.js';

// Model type definitions
export interface Admin {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  data: string;
  expiresAt: string;
}

export interface Booking {
  id: number;
  accessToken?: string;
  tripType: string;
  fromLocation: string;
  toLocation: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string;
  returnTime?: string;
  passengers: number;
  adults: number;
  children: number;
  infants: number;
  passengerName?: string;
  passengerPhone?: string;
  passengerDocument?: string;
  fareClass?: string;
  selectedTrip?: string;
  selectedSeats?: string;
  paymentMethod?: string;
  paymentStatus: string;
  totalAmount: number;
  status: string;
  notes?: string;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  createdAt: string;
}

export interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Price {
  id: number;
  fromCity: string;
  toCity: string;
  distance: number;
  duration: number;
  economyPrice: number;
  businessPrice: number;
  vipPrice: number;
  borderCrossings: string;
  generated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bank {
  id: number;
  key: string;
  type: 'bank' | 'wallet';
  name: string;
  nameEn: string;
  color: string;
  colorDark: string;
  colorLight: string;
  otpMessage: string;
  supportPhone: string;
  website: string;
  bins: string;
  logoUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Visitor {
  id: number;
  sessionId: string;
  ip: string;
  country: string;
  city: string;
  userAgent: string;
  page: string;
  currentStep: string;
  stepHistory: string;
  isBlocked: boolean;
  redirectUrl?: string;
  bookingData: string;
  geoLat?: number;
  geoLng?: number;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: number;
  name: string;
  lat: number;
  lng: number;
  region: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

type WhereClause = Record<string, unknown>;
type OrderByClause = Record<string, 'asc' | 'desc'>;

type SyncCollection<T extends { id: number | string }> = SqliteCollection<T>;
type AsyncCollection<T extends { id: number | string }> = TursoCollection<T>;

class DatabaseCollection<T extends { id: number | string }> {
  private readonly local: SyncCollection<T> | null;
  private readonly remote: AsyncCollection<T> | null;

  constructor(tableName: string, booleanFields: ReadonlySet<string> = new Set()) {
    if (tursoConfigured) {
      this.local = null;
      this.remote = new TursoCollection<T>(tableName, booleanFields);
    } else {
      this.local = new SqliteCollection<T>(tableName, booleanFields);
      this.remote = null;
    }
  }

  async count(options?: { where?: WhereClause }): Promise<number> {
    return this.remote ? this.remote.count(options) : this.local!.count(options);
  }

  async findUnique(options: { where: WhereClause }): Promise<T | null> {
    return this.remote ? this.remote.findUnique(options) : this.local!.findUnique(options);
  }

  async findFirst(options?: { where?: WhereClause; orderBy?: OrderByClause }): Promise<T | null> {
    return this.remote ? this.remote.findFirst(options) : this.local!.findFirst(options);
  }

  async findMany(options?: { where?: WhereClause; orderBy?: OrderByClause; take?: number }): Promise<T[]> {
    return this.remote ? this.remote.findMany(options) : this.local!.findMany(options);
  }

  async create(options: { data: Record<string, unknown> }): Promise<T> {
    return this.remote ? this.remote.create(options) : this.local!.create(options);
  }

  async update(options: { where: WhereClause; data: Record<string, unknown> }): Promise<T> {
    return this.remote ? this.remote.update(options) : this.local!.update(options);
  }

  async updateMany(options: { where?: WhereClause; data: Record<string, unknown> }): Promise<{ count: number }> {
    return this.remote ? this.remote.updateMany(options) : this.local!.updateMany(options);
  }

  async upsert(options: { where: WhereClause; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<T> {
    return this.remote ? this.remote.upsert(options) : this.local!.upsert(options);
  }

  async upsertMany(options: { uniqueKey: string; data: Array<Record<string, unknown>> }): Promise<T[]> {
    return this.remote ? this.remote.upsertMany(options) : this.local!.upsertMany(options);
  }

  async delete(options: { where: WhereClause }): Promise<T> {
    return this.remote ? this.remote.delete(options) : this.local!.delete(options);
  }

  async deleteMany(options?: { where?: WhereClause }): Promise<{ count: number }> {
    return this.remote ? this.remote.deleteMany(options) : this.local!.deleteMany(options);
  }

  async aggregate(options: { _sum?: Record<string, boolean> }): Promise<{ _sum: Record<string, number | null> }> {
    return this.remote ? this.remote.aggregate(options) : this.local!.aggregate(options);
  }
}

export const databaseBackend = tursoConfigured ? 'turso' as const : 'sqlite' as const;
export const isDurableDatabaseConfigured = () => tursoConfigured || !process.env.VERCEL;

// Vercel uses Turso when TURSO_DATABASE_URL/TURSO_AUTH_TOKEN are present.
// Runtime/VPS continues to use the existing embedded SQLite database by default.
export const db = {
  admin: new DatabaseCollection<Admin>('admins'),
  session: new DatabaseCollection<Session>('sessions'),
  booking: new DatabaseCollection<Booking>('bookings', new Set(['isNew'])),
  contact: new DatabaseCollection<Contact>('contacts'),
  review: new DatabaseCollection<Review>('reviews', new Set(['approved'])),
  notification: new DatabaseCollection<Notification>('notifications', new Set(['isRead'])),
  price: new DatabaseCollection<Price>('prices', new Set(['generated'])),
  bank: new DatabaseCollection<Bank>('banks', new Set(['enabled'])),
  setting: new DatabaseCollection<Setting>('settings'),
  visitor: new DatabaseCollection<Visitor>('visitors', new Set(['isBlocked'])),
  city: new DatabaseCollection<City>('cities'),
};
