import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Form, InputGroup, Button, Pagination, Alert } from 'react-bootstrap';
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
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
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

  function renderPagination() {
    const { page, totalPages } = pagination;
    if (totalPages <= 1) return null;
    const items = [];
    items.push(
      <Pagination.Prev key="prev" disabled={page === 1} onClick={() => fetchProducts(page - 1)} />
    );
    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 7 && p > 3 && p < totalPages - 1 && Math.abs(p - page) > 1) {
        if (p === 4 || p === totalPages - 2) items.push(<Pagination.Ellipsis key={`e${p}`} />);
        continue;
      }
      items.push(
        <Pagination.Item key={p} active={p === page} onClick={() => fetchProducts(p)}>{p}</Pagination.Item>
      );
    }
    items.push(
      <Pagination.Next key="next" disabled={page === totalPages} onClick={() => fetchProducts(page + 1)} />
    );
    return <Pagination className="justify-content-center mt-4">{items}</Pagination>;
  }

  return (
    <div>
      <h2 className="fw-bold mb-4">Products</h2>

      {addMessage && <Alert variant="success" dismissible onClose={() => setAddMessage('')}>{addMessage}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Row className="mb-4">
        {/* Search */}
        <Col md={7}>
          <Form onSubmit={handleSearch}>
            <InputGroup>
              <Form.Control
                placeholder="Search products…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button type="submit" variant="primary">Search</Button>
              {search && (
                <Button variant="outline-secondary" onClick={() => { setSearch(''); setSearchInput(''); }}>
                  Clear
                </Button>
              )}
            </InputGroup>
          </Form>
        </Col>

        {/* Category filter */}
        <Col md={5} className="mt-2 mt-md-0 d-flex flex-wrap gap-1 align-items-center">
          <span className="small text-muted me-1">Category:</span>
          <Button
            size="sm"
            variant={selectedCategory === '' ? 'primary' : 'outline-primary'}
            onClick={() => setSelectedCategory('')}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={selectedCategory === String(cat.id) ? 'primary' : 'outline-primary'}
              onClick={() => handleCategoryChange(String(cat.id))}
            >
              {cat.name}
            </Button>
          ))}
        </Col>
      </Row>

      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <div className="text-center text-muted py-5">
          <p className="fs-5">No products found.</p>
          {(search || selectedCategory) && (
            <Button variant="link" onClick={() => { setSearch(''); setSearchInput(''); setSelectedCategory(''); }}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-muted small">{pagination.total} product{pagination.total !== 1 ? 's' : ''} found</p>
          <Row xs={1} sm={2} md={3} lg={4} className="g-4">
            {products.map((product) => (
              <Col key={product.id}>
                <ProductCard product={product} onAddToCart={handleAddToCart} addingId={addingId} />
              </Col>
            ))}
          </Row>
          {renderPagination()}
        </>
      )}
    </div>
  );
}
