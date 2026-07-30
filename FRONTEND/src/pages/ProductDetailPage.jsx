import React, { useState, useEffect } from 'react';
import { formatINR } from '../utils/formatCurrency';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  if (!product && error) return <div className="fk-section"><div className="fk-alert fk-alert--danger">{error}</div></div>;
  if (!product) return null;

  const isOutOfStock = product.stock_qty === 0;
  const maxQty = Math.min(product.stock_qty, 10);
  const seed = (product.id * 17 + 5) % 16;
  const discountPct = 20 + seed;
  const originalPrice = product.price / (1 - discountPct / 100);
  const stars = 3.5 + ((product.id * 7) % 15) / 10;
  const ratingCount = 200 + ((product.id * 53) % 4800);

  return (
    <div className="fk-pdp-page">
      {/* Breadcrumb */}
      <div className="fk-breadcrumb">
        <Link to="/" className="fk-bread-link">Home</Link>
        <span className="fk-bread-sep">›</span>
        <Link to="/products" className="fk-bread-link">Products</Link>
        {product.category_name && <>
          <span className="fk-bread-sep">›</span>
          <span className="fk-bread-link">{product.category_name}</span>
        </>}
        <span className="fk-bread-sep">›</span>
        <span className="fk-bread-current">{product.name}</span>
      </div>

      <div className="fk-pdp-card">
        {/* Left — image panel */}
        <div className="fk-pdp-img-panel">
          <img
            src={product.image_url || 'https://via.placeholder.com/500x500?text=No+Image'}
            alt={product.name}
            className="fk-pdp-img"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/500x500?text=No+Image'; }}
          />
        </div>

        {/* Right — details panel */}
        <div className="fk-pdp-info">
          {product.category_name && (
            <span className="fk-pdp-cat">{product.category_name}</span>
          )}
          <h1 className="fk-pdp-name">{product.name}</h1>

          {/* Rating */}
          <div className="fk-pdp-rating-row">
            <span className="fk-rating-pill">
              {stars.toFixed(1)} ★
            </span>
            <span className="fk-rating-count">{ratingCount.toLocaleString('en-IN')} ratings</span>
          </div>

          <div className="fk-pdp-divider" />

          {/* Price block */}
          <div className="fk-pdp-price-block">
            <span className="fk-pdp-price">{formatINR(product.price)}</span>
            <span className="fk-pdp-original">{formatINR(originalPrice)}</span>
            <span className="fk-pdp-discount">{discountPct}% off</span>
          </div>
          <p className="fk-pdp-delivery-tag">Free delivery · In stock: {product.stock_qty}</p>

          <div className="fk-pdp-divider" />

          {/* Description */}
          <p className="fk-pdp-desc">{product.description}</p>

          {/* Feedback */}
          {success && <div className="fk-alert fk-alert--success">{success}</div>}
          {error   && <div className="fk-alert fk-alert--danger">{error}</div>}

          {/* Qty + actions */}
          {!isOutOfStock ? (
            <>
              <div className="fk-pdp-qty-row">
                <span className="fk-pdp-qty-label">Quantity</span>
                <div className="fk-qty-ctrl">
                  <button className="fk-qty-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>−</button>
                  <span className="fk-qty-val">{quantity}</span>
                  <button className="fk-qty-btn" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty}>+</button>
                </div>
              </div>
              <div className="fk-pdp-actions">
                <button className="fk-btn fk-btn-cart fk-pdp-action-btn" disabled={adding} onClick={handleAddToCart}>
                  {adding ? 'Adding…' : '🛒 Add to Cart'}
                </button>
                <button className="fk-btn fk-btn-buy fk-pdp-action-btn" disabled={adding} onClick={handleAddToCart}>
                  Buy Now
                </button>
              </div>
            </>
          ) : (
            <div className="fk-oos-badge fk-oos-large">Currently Unavailable</div>
          )}
        </div>
      </div>
    </div>
  );
}
