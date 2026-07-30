import React from 'react';
import { formatINR } from '../utils/formatCurrency';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../services/cartService';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const { cartItems, cartTotal, updateCartState } = useCart();
  const navigate = useNavigate();
  const [error, setError] = React.useState('');
  const [loadingId, setLoadingId] = React.useState(null);

  async function handleQuantityChange(productId, newQty) {
    setLoadingId(productId);
    setError('');
    try {
      const cart = await cartService.updateItem(productId, newQty);
      updateCartState(cart);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update cart.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRemove(productId) {
    setLoadingId(productId);
    setError('');
    try {
      const cart = await cartService.removeItem(productId);
      updateCartState(cart);
    } catch {
      setError('Could not remove item.');
    } finally {
      setLoadingId(null);
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="fk-cart-empty">
        <div className="fk-cart-empty-icon">🛒</div>
        <h2>Your cart is empty!</h2>
        <p>Add items to it now.</p>
        <Link to="/products" className="fk-btn fk-btn-cart" style={{ display: 'inline-block', padding: '12px 32px' }}>
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="fk-cart-page">
      <div className="fk-cart-layout">

        {/* ── Items panel ── */}
        <div className="fk-cart-items">
          <div className="fk-cart-header">
            <h2 className="fk-cart-title">My Cart <span className="fk-cart-count">({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</span></h2>
          </div>

          {error && <div className="fk-alert fk-alert--danger">{error}</div>}

          {cartItems.map((item) => (
            <div key={item.product_id} className="fk-cart-row">
              <img
                src={item.image_url || 'https://via.placeholder.com/80'}
                alt={item.name}
                className="fk-cart-img"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }}
              />
              <div className="fk-cart-item-info">
                <p className="fk-cart-item-name">{item.name}</p>
                <p className="fk-cart-item-price">{formatINR(item.unit_price)}</p>
                <div className="fk-cart-item-actions">
                  <div className="fk-qty-ctrl">
                    <button className="fk-qty-btn"
                      onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                      disabled={loadingId === item.product_id}>−</button>
                    <span className="fk-qty-val">{item.quantity}</span>
                    <button className="fk-qty-btn"
                      onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                      disabled={loadingId === item.product_id || item.quantity >= item.stock_qty}>+</button>
                  </div>
                  <button className="fk-cart-remove"
                    onClick={() => handleRemove(item.product_id)}
                    disabled={loadingId === item.product_id}>
                    Remove
                  </button>
                </div>
              </div>
              <div className="fk-cart-item-total">
                {formatINR(parseFloat(item.unit_price) * item.quantity)}
              </div>
            </div>
          ))}

          <div className="fk-cart-place-row">
            <button className="fk-btn fk-btn-cart fk-cart-place-btn" onClick={() => navigate('/checkout')}>
              Place Order
            </button>
          </div>
        </div>

        {/* ── Price summary ── */}
        <div className="fk-price-summary">
          <div className="fk-price-summary-header">PRICE DETAILS</div>
          <div className="fk-price-summary-row">
            <span>Price ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</span>
            <span>{formatINR(cartTotal)}</span>
          </div>
          <div className="fk-price-summary-row">
            <span>Delivery Charges</span>
            <span className="fk-price-free">FREE</span>
          </div>
          <div className="fk-price-summary-divider" />
          <div className="fk-price-summary-row fk-price-summary-total">
            <span>Total Amount</span>
            <span>{formatINR(cartTotal)}</span>
          </div>
          <div className="fk-price-summary-saving">
            You will save ₹0 on this order
          </div>
          <button className="fk-btn fk-btn-cart fk-price-summary-btn" onClick={() => navigate('/checkout')}>
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}
