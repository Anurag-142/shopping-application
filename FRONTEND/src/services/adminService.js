import api from './api';

export const adminService = {
  getProducts: (params = {}) => api.get('/admin/products', { params }).then((r) => r.data),
  createProduct: (data) => api.post('/admin/products', data).then((r) => r.data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data).then((r) => r.data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`).then((r) => r.data),
};
