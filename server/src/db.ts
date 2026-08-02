import { SqliteCollection } from './sqliteDb.js';

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

// Embedded SQLite database — no external database service required.
// Legacy JSON collections are imported automatically on the first start.
export const db = {
  admin: new SqliteCollection<Admin>('admins'),
  session: new SqliteCollection<Session>('sessions'),
  booking: new SqliteCollection<Booking>('bookings', new Set(['isNew'])),
  contact: new SqliteCollection<Contact>('contacts'),
  review: new SqliteCollection<Review>('reviews', new Set(['approved'])),
  notification: new SqliteCollection<Notification>('notifications', new Set(['isRead'])),
  price: new SqliteCollection<Price>('prices', new Set(['generated'])),
  bank: new SqliteCollection<Bank>('banks', new Set(['enabled'])),
  setting: new SqliteCollection<Setting>('settings'),
  visitor: new SqliteCollection<Visitor>('visitors', new Set(['isBlocked'])),
  city: new SqliteCollection<City>('cities'),
};
