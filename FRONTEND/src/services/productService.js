import api from './api';

export const productService = {
  getProducts: (params = {}) => api.get('/products', { params }).then((r) => r.data),
  getById: (id) => api.get(`/products/${id}`).then((r) => r.data),
  getCategories: () => api.get('/categories').then((r) => r.data),
};
