import api from './api';

export const orderService = {
  createOrder: (data) => api.post('/orders', data).then((r) => r.data),
  getOrders: () => api.get('/orders').then((r) => r.data),
  getOrderDetail: (orderId) => api.get(`/orders/${orderId}`).then((r) => r.data),
};
