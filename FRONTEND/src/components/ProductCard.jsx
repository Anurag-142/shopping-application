import React from 'react';
import { Link } from 'react-router-dom';
import { formatINR } from '../utils/formatCurrency';

/**
 * Flipkart-style product card.
 */
export default function ProductCard({ product, onAddToCart, addingId }) {
  const isOutOfStock = product.stock_qty === 0;
  const isAdding = addingId === product.id;

  // Derive a fake original price (20–35 % above selling price) for the strikethrough
  const seed = (product.id * 17 + 5) % 16; // deterministic 0-15
  const discountPct = 20 + seed; // 20 % – 35 %
  const originalPrice = product.price / (1 - discountPct / 100);

  // Fixed star rating derived from id so it stays stable
  const stars = 3.5 + ((product.id * 7) % 15) / 10; // 3.5 – 5.0
  const ratingCount = 200 + ((product.id * 53) % 4800);

  function StarBar({ value }) {
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    return (
      <span className="fk-stars">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= full ? 'fk-star filled' : half && i === full + 1 ? 'fk-star half' : 'fk-star empty'}>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className={`fk-card${isOutOfStock ? ' fk-card--oos' : ''}`}>
      {/* Image area */}
      <Link to={`/products/${product.id}`} className="fk-img-wrap">
        <img
          src={product.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}
          alt={product.name}
          className="fk-img"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
        />
        {isOutOfStock && <span className="fk-oos-badge">Out of Stock</span>}
      </Link>

      {/* Info area */}
      <div className="fk-body">
        <p className="fk-name">{product.name}</p>

        {/* Rating row */}
        <div className="fk-rating-row">
          <span className="fk-rating-pill">
            {stars.toFixed(1)} <StarBar value={stars} />
          </span>
          <span className="fk-rating-count">({ratingCount.toLocaleString('en-IN')})</span>
        </div>

        {/* Price row */}
        <div className="fk-price-row">
          <span className="fk-price">{formatINR(product.price)}</span>
          <span className="fk-original">{formatINR(originalPrice)}</span>
          <span className="fk-discount">{discountPct}% off</span>
        </div>

        {/* Free delivery tag */}
        <p className="fk-delivery">Free delivery</p>

        {/* Actions */}
        <div className="fk-actions">
          <button
            className="fk-btn fk-btn-cart"
            disabled={isOutOfStock || isAdding}
            onClick={() => onAddToCart(product)}
          >
            {isAdding ? 'Adding…' : isOutOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
          </button>
          <Link to={`/products/${product.id}`} className="fk-btn fk-btn-buy">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
