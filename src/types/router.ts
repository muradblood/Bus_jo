// Minimal AppRouter type definition for frontend-only static hosting
// Replaces the backend api/router.ts import so we can delete the entire api/ folder

export type AppRouter = {
  ping: { _def: { type: 'query' } };
  auth: {
    me: { _def: { type: 'query' } };
    login: { _def: { type: 'mutation' } };
    logout: { _def: { type: 'mutation' } };
  };
  admin: {
    stats: { _def: { type: 'query' } };
    bookings: { _def: { type: 'query' } };
    contacts: { _def: { type: 'query' } };
    deleteContact: { _def: { type: 'mutation' } };
    reviews: { _def: { type: 'query' } };
    deleteReview: { _def: { type: 'mutation' } };
    createNotification: { _def: { type: 'mutation' } };
    getNotifications: { _def: { type: 'query' } };
    markNotificationRead: { _def: { type: 'mutation' } };
    updateBookingStatus: { _def: { type: 'mutation' } };
    markBookingSeen: { _def: { type: 'mutation' } };
    markAllBookingsSeen: { _def: { type: 'mutation' } };
  };
  cities: {
    list: { _def: { type: 'query' } };
    search: { _def: { type: 'query' } };
    autoComplete: { _def: { type: 'query' } };
  };
  bookings: {
    create: { _def: { type: 'mutation' } };
    updateStep: { _def: { type: 'mutation' } };
    list: { _def: { type: 'query' } };
    get: { _def: { type: 'query' } };
    delete: { _def: { type: 'mutation' } };
  };
  prices: {
    calculate: { _def: { type: 'query' } };
    bulkCalculate: { _def: { type: 'query' } };
    get: { _def: { type: 'query' } };
    list: { _def: { type: 'query' } };
    upsert: { _def: { type: 'mutation' } };
    delete: { _def: { type: 'mutation' } };
  };
  settings: {
    list: { _def: { type: 'query' } };
    get: { _def: { type: 'query' } };
    upsert: { _def: { type: 'mutation' } };
    getTelegramToken: { _def: { type: 'query' } };
  };
  visitors: {
    track: { _def: { type: 'mutation' } };
    stats: { _def: { type: 'query' } };
    list: { _def: { type: 'query' } };
    blockVisitor: { _def: { type: 'mutation' } };
    setRedirectUrl: { _def: { type: 'mutation' } };
  };
};
