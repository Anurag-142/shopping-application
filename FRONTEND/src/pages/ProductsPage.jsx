import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { productService } from '../services/productService';
import { cartService } from '../services/cartService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProductsPage() {
  const { isAuthenticated } = useAuth();
  const { updateCartState } = useCart();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [addMessage, setAddMessage] = useState('');

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (selectedCategory) params.categoryId = selectedCategory;
      const data = await productService.getProducts(params);
      setProducts(data.products);
      setPagination(data.pagination);
    } catch {
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function handleCategoryChange(catId) {
    setSelectedCategory(catId === selectedCategory ? '' : catId);
  }

  async function handleAddToCart(product) {
    if (!isAuthenticated) { navigate('/login'); return; }
    setAddingId(product.id);
    try {
      const cart = await cartService.addItem(product.id, 1);
      updateCartState(cart);
      setAddMessage(`"${product.name}" added to cart!`);
      setTimeout(() => setAddMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add item to cart.');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="fk-page">

      {/* ── Top search bar (Flipkart blue) ── */}
      <div className="fk-search-bar">
        <form onSubmit={handleSearch} className="fk-search-form">
          <input
            className="fk-search-input"
            placeholder="Search for products, brands and more"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="fk-search-btn">🔍 Search</button>
          {search && (
            <button
              type="button"
              className="fk-search-clear"
              onClick={() => { setSearch(''); setSearchInput(''); }}
            >✕</button>
          )}
        </form>
      </div>

      {addMessage && (
        <Alert variant="success" dismissible onClose={() => setAddMessage('')} className="mx-3 mt-2 mb-0">
          {addMessage}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mx-3 mt-2 mb-0">
          {error}
        </Alert>
      )}

      <div className="fk-layout">

        {/* ── Left sidebar — category filters ── */}
        <aside className="fk-sidebar">
          <div className="fk-sidebar-header">Filters</div>

          <div className="fk-filter-section">
            <div className="fk-filter-title">CATEGORY</div>
            <ul className="fk-filter-list">
              <li>
                <label className="fk-filter-label">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === ''}
                    onChange={() => setSelectedCategory('')}
                  />
                  <span>All</span>
                </label>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <label className="fk-filter-label">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === String(cat.id)}
                      onChange={() => handleCategoryChange(String(cat.id))}
                    />
                    <span>{cat.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="fk-main">
          {/* Results meta */}
          {!loading && products.length > 0 && (
            <div className="fk-results-bar">
              <span className="fk-results-count">
                {selectedCategory
                  ? categories.find((c) => String(c.id) === selectedCategory)?.name
                  : 'All Products'} — <strong>{pagination.total}</strong> item{pagination.total !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {loading ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <div className="fk-empty">
              <div className="fk-empty-icon">🔍</div>
              <p>No products found.</p>
              {(search || selectedCategory) && (
                <button
                  className="fk-btn fk-btn-cart"
                  onClick={() => { setSearch(''); setSearchInput(''); setSelectedCategory(''); }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="fk-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  addingId={addingId}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="fk-pagination">
              <button
                className="fk-page-btn"
                disabled={pagination.page === 1}
                onClick={() => fetchProducts(pagination.page - 1)}
              >‹ Prev</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`fk-page-btn${p === pagination.page ? ' active' : ''}`}
                  onClick={() => fetchProducts(p)}
                >{p}</button>
              ))}
              <button
                className="fk-page-btn"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchProducts(pagination.page + 1)}
              >Next ›</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
