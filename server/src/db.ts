import { JsonCollection } from './jsonDb.js';

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
  cardInfo: string;
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

// JSON file-based database — no external DB required.
// Data is stored in JSON files (data/ locally, /tmp/bus_jo_data on Vercel).
export const db = {
  admin: new JsonCollection<Admin>('admins'),
  session: new JsonCollection<Session>('sessions'),
  booking: new JsonCollection<Booking>('bookings'),
  contact: new JsonCollection<Contact>('contacts'),
  review: new JsonCollection<Review>('reviews'),
  notification: new JsonCollection<Notification>('notifications'),
  price: new JsonCollection<Price>('prices'),
  bank: new JsonCollection<Bank>('banks'),
  setting: new JsonCollection<Setting>('settings'),
  visitor: new JsonCollection<Visitor>('visitors'),
  city: new JsonCollection<City>('cities'),
};
