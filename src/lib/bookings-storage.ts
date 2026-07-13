// ═══════════════════════════════════════════════════════════
// Bookings Storage — LocalStorage-based booking system
// ═══════════════════════════════════════════════════════════

export type BookingStatus = 'new' | 'pending' | 'confirmed' | 'cancelled';

export interface StoredBooking {
  id: number;
  fromLocation: string;
  toLocation: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string;
  returnTime?: string;
  passengers: number;
  passengerName: string;
  phone: string;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
  paymentMethod?: string;
  selectedTrip?: string;
  selectedSeats?: string;
  fareClass?: string;
  adults: number;
  children: number;
  infants: number;
  notes?: string;
  // Track if admin has seen this booking
  isNew?: boolean;
}

const STORAGE_KEY = 'sat_bookings_v2';
const LAST_ID_KEY = 'sat_booking_last_id';

// Get all stored bookings
export function getStoredBookings(): StoredBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

// Save all bookings
export function saveStoredBookings(bookings: StoredBooking[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

// Get next ID
function getNextId(): number {
  const last = parseInt(localStorage.getItem(LAST_ID_KEY) || '0', 10);
  const next = last + 1;
  localStorage.setItem(LAST_ID_KEY, String(next));
  return next;
}

// Add a new booking (called from frontend when search form is submitted)
export function addBooking(booking: Omit<StoredBooking, 'id' | 'createdAt' | 'status' | 'isNew'>): StoredBooking {
  const bookings = getStoredBookings();
  const newBooking: StoredBooking = {
    ...booking,
    id: getNextId(),
    createdAt: new Date().toISOString(),
    status: 'new',
    isNew: true,
  };
  bookings.unshift(newBooking); // newest first
  saveStoredBookings(bookings);
  return newBooking;
}

// Update booking status
export function updateBookingStatus(id: number, status: BookingStatus) {
  const bookings = getStoredBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx >= 0) {
    bookings[idx] = { ...bookings[idx], status };
    saveStoredBookings(bookings);
  }
}

// Update booking field
export function updateBookingField(id: number, fields: Partial<StoredBooking>) {
  const bookings = getStoredBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx >= 0) {
    bookings[idx] = { ...bookings[idx], ...fields };
    saveStoredBookings(bookings);
  }
}

// Mark booking as seen (not new anymore)
export function markBookingSeen(id: number) {
  const bookings = getStoredBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx >= 0) {
    bookings[idx] = { ...bookings[idx], isNew: false };
    saveStoredBookings(bookings);
  }
}

// Mark all as seen
export function markAllBookingsSeen() {
  const bookings = getStoredBookings().map(b => ({ ...b, isNew: false }));
  saveStoredBookings(bookings);
}

// Delete booking
export function deleteBooking(id: number) {
  const bookings = getStoredBookings().filter(b => b.id !== id);
  saveStoredBookings(bookings);
}

// Count new (unseen) bookings
export function getNewBookingsCount(): number {
  return getStoredBookings().filter(b => b.isNew).length;
}

// Get stats
export function getBookingStats() {
  const bookings = getStoredBookings();
  return {
    total: bookings.length,
    new: bookings.filter(b => b.status === 'new').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    unseen: bookings.filter(b => b.isNew).length,
    revenue: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
  };
}

// Export to CSV
export function exportBookingsToCSV(): string {
  const bookings = getStoredBookings();
  const headers = ['ID,الرحلة,التاريخ,المسافر,الهاتف,المبلغ,الحالة,تاريخ الإنشاء'];
  const rows = bookings.map(b =>
    `${b.id},${b.fromLocation}→${b.toLocation},${b.pickupDate},${b.passengerName},${b.phone},${b.totalAmount},${b.status},${b.createdAt}`
  );
  return [...headers, ...rows].join('\n');
}

// Seed with demo data (only if empty)
export function seedDemoBookings() {
  if (getStoredBookings().length > 0) return;
  const demos: StoredBooking[] = [
    { id: 1, fromLocation: 'الرياض', toLocation: 'دبي', pickupDate: '2025-07-10', pickupTime: '08:00', passengers: 2, passengerName: 'محمد العبدالله', phone: '0501234567', totalAmount: 380, status: 'confirmed', createdAt: '2025-07-01T10:00:00', adults: 2, children: 0, infants: 0, isNew: false, paymentMethod: 'بطاقة ائتمان', fareClass: 'أعمال' },
    { id: 2, fromLocation: 'جدة', toLocation: 'عمان', pickupDate: '2025-07-12', pickupTime: '14:00', passengers: 1, passengerName: 'فهد السالم', phone: '0559876543', totalAmount: 420, status: 'pending', createdAt: '2025-07-02T12:30:00', adults: 1, children: 0, infants: 0, isNew: false, paymentMethod: 'Apple Pay', fareClass: 'VIP' },
    { id: 3, fromLocation: 'الدمام', toLocation: 'الدوحة', pickupDate: '2025-07-15', pickupTime: '09:30', passengers: 3, passengerName: 'عبدالرحمن العلي', phone: '0534567890', totalAmount: 360, status: 'confirmed', createdAt: '2025-07-03T08:15:00', adults: 2, children: 1, infants: 0, isNew: false, fareClass: 'اقتصادي' },
    { id: 4, fromLocation: 'القاهرة', toLocation: 'الرياض', pickupDate: '2025-07-18', pickupTime: '11:00', passengers: 2, passengerName: 'خالد المغربي', phone: '0567890123', totalAmount: 280, status: 'new', createdAt: '2025-07-04T16:45:00', adults: 2, children: 0, infants: 0, isNew: true, fareClass: 'اقتصادي' },
    { id: 5, fromLocation: 'أبوظبي', toLocation: 'الكويت العاصمة', pickupDate: '2025-07-20', pickupTime: '07:00', passengers: 1, passengerName: 'ناصر الحربي', phone: '0545678901', totalAmount: 350, status: 'pending', createdAt: '2025-07-05T09:20:00', adults: 1, children: 0, infants: 0, isNew: false, paymentMethod: 'STC Pay', fareClass: 'أعمال' },
  ];
  saveStoredBookings(demos);
  localStorage.setItem(LAST_ID_KEY, '5');
}
