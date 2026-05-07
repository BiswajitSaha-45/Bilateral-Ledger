// Reuse the existing configured axios instance (has auth interceptor + correct base URL)
import api from './api';

export const paymentsAPI = {
  createOrder: (partnerId) =>
    api.post('/payments/create-order', { partner_id: partnerId }),

  verifyPayment: (payload) =>
    api.post('/payments/verify', payload),
};
