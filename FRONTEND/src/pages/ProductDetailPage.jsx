import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { productService } from '../services/productService';
import { cartService } from '../services/cartService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { updateCartState } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    productService.getById(id)
      .then(setProduct)
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAddToCart() {
    if (!isAuthenticated) { navigate('/login'); return; }
    setAdding(true);
    setError('');
    try {
      const cart = await cartService.addItem(product.id, quantity);
      updateCartState(cart);
      setSuccess(`Added ${quantity} × "${product.name}" to cart!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add to cart.');
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!product && error) return <Alert variant="danger">{error}</Alert>;
  if (!product) return null;

  const isOutOfStock = product.stock_qty === 0;
  const maxQty = Math.min(product.stock_qty, 10);

  return (
    <div>
      <Button variant="link" className="mb-3 ps-0 text-decoration-none" onClick={() => navigate(-1)}>
        ← Back to Products
      </Button>
      <Row>
        <Col md={5}>
          <img
            src={product.image_url || 'https://via.placeholder.com/500x400?text=No+Image'}
            alt={product.name}
            className="img-fluid rounded shadow-sm w-100"
            style={{ maxHeight: '420px', objectFit: 'cover' }}
            onError={(e) => { e.target.src = 'https://via.placeholder.com/500x400?text=No+Image'; }}
          />
        </Col>
        <Col md={7} className="mt-4 mt-md-0">
          {product.category_name && (
            <Badge bg="secondary" className="mb-2">{product.category_name}</Badge>
          )}
          <h2 className="fw-bold">{product.name}</h2>
          <p className="text-primary fs-3 fw-bold">${parseFloat(product.price).toFixed(2)}</p>
          <p className="text-muted">{product.description}</p>

          <div className="mb-3">
            {isOutOfStock ? (
              <Badge bg="warning" text="dark" className="fs-6">Out of Stock</Badge>
            ) : (
              <span className="text-success small">{product.stock_qty} in stock</span>
            )}
          </div>

          {success && <Alert variant="success">{success}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          {!isOutOfStock && (
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="d-flex align-items-center border rounded">
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >−</Button>
                <span className="px-3 fw-semibold">{quantity}</span>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                >+</Button>
              </div>
              <Button
                variant="primary"
                size="lg"
                disabled={adding || isOutOfStock}
                onClick={handleAddToCart}
              >
                {adding ? <><Spinner size="sm" animation="border" className="me-2" />Adding…</> : 'Add to Cart'}
              </Button>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
}
