import api from './api';

export const cartService = {
  getCart: () => api.get('/cart').then((r) => r.data),
  addItem: (productId, quantity) => api.post('/cart', { productId, quantity }).then((r) => r.data),
  updateItem: (productId, quantity) => api.put(`/cart/${productId}`, { quantity }).then((r) => r.data),
  removeItem: (productId) => api.delete(`/cart/${productId}`).then((r) => r.data),
  clearCart: () => api.delete('/cart').then((r) => r.data),
};
