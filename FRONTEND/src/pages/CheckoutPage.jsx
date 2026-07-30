import React, { useState } from 'react';
import { formatINR } from '../utils/formatCurrency';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { useCart } from '../context/CartContext';

const EMPTY_SHIPPING = { name: '', street: '', city: '', state: '', postcode: '', country: '' };
const EMPTY_PAYMENT  = { cardName: '', cardNumber: '', expiry: '', cvv: '' };

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [shipping, setShipping]       = useState(EMPTY_SHIPPING);
  const [payment, setPayment]         = useState(EMPTY_PAYMENT);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError]       = useState('');
  const [loading, setLoading]         = useState(false);

  if (cartItems.length === 0) {
    return (
      <div className="fk-cart-empty">
        <div className="fk-cart-empty-icon">🛒</div>
        <h2>Your cart is empty</h2>
        <a href="/products" className="fk-btn fk-btn-cart" style={{ display: 'inline-block', padding: '12px 32px' }}>
          Shop Now
        </a>
      </div>
    );
  }

  function handleShipping(e) {
    const { name, value } = e.target;
    setShipping((p) => ({ ...p, [name]: value }));
    setFieldErrors((p) => ({ ...p, [name]: '' }));
  }

  function handlePayment(e) {
    const { name, value } = e.target;
    if (name === 'cardNumber') {
      setPayment((p) => ({ ...p, cardNumber: value.replace(/\D/g, '').slice(0, 16) }));
    } else if (name === 'expiry') {
      const c = value.replace(/\D/g, '').slice(0, 4);
      setPayment((p) => ({ ...p, expiry: c.length > 2 ? `${c.slice(0, 2)}/${c.slice(2)}` : c }));
    } else {
      setPayment((p) => ({ ...p, [name]: value }));
    }
    setFieldErrors((p) => ({ ...p, [name]: '' }));
  }

  function validate() {
    const e = {};
    if (!shipping.name.trim())     e.name     = 'Full name is required.';
    if (!shipping.street.trim())   e.street   = 'Street address is required.';
    if (!shipping.city.trim())     e.city     = 'City is required.';
    if (!shipping.postcode.trim()) e.postcode = 'Postcode is required.';
    if (!shipping.country.trim())  e.country  = 'Country is required.';
    if (!payment.cardName.trim())  e.cardName = 'Cardholder name is required.';
    if (payment.cardNumber.length !== 16) e.cardNumber = 'Card number must be 16 digits.';
    if (!/^\d{2}\/\d{2}$/.test(payment.expiry)) e.expiry = 'Use MM/YY format.';
    if (!payment.cvv || payment.cvv.length < 3)  e.cvv   = 'CVV is required (3–4 digits).';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setLoading(true);
    setApiError('');
    try {
      const result = await orderService.createOrder({
        shippingAddress: shipping,
        paymentDetails: { cardNumber: payment.cardNumber, expiry: payment.expiry, cvv: payment.cvv },
      });
      clearCart();
      navigate(`/order-confirmation/${result.orderId}`);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function Field({ label, name, value, onChange, placeholder, err, type = 'text', maxLength }) {
    return (
      <div className="fk-field">
        <label className="fk-field-label">{label}</label>
        <input className={`fk-field-input${err ? ' fk-field-input--err' : ''}`}
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} maxLength={maxLength} />
        {err && <span className="fk-field-err">{err}</span>}
      </div>
    );
  }

  return (
    <div className="fk-checkout-page">
      {apiError && <div className="fk-alert fk-alert--danger">{apiError}</div>}

      <form onSubmit={handleSubmit} noValidate className="fk-checkout-layout">

        {/* ── Left col ── */}
        <div className="fk-checkout-left">

          {/* Shipping */}
          <div className="fk-checkout-section">
            <div className="fk-checkout-section-title">📦 Delivery Address</div>
            <div className="fk-fields-grid">
              <Field label="Full Name *"       name="name"     value={shipping.name}     onChange={handleShipping} placeholder="Jane Doe"      err={fieldErrors.name} />
              <Field label="Street Address *"  name="street"   value={shipping.street}   onChange={handleShipping} placeholder="123 MG Road"   err={fieldErrors.street} />
              <Field label="City *"            name="city"     value={shipping.city}     onChange={handleShipping} placeholder="Mumbai"         err={fieldErrors.city} />
              <Field label="State"             name="state"    value={shipping.state}    onChange={handleShipping} placeholder="Maharashtra" />
              <Field label="Pincode *"         name="postcode" value={shipping.postcode} onChange={handleShipping} placeholder="400001"         err={fieldErrors.postcode} />
              <Field label="Country *"         name="country"  value={shipping.country}  onChange={handleShipping} placeholder="India"          err={fieldErrors.country} />
            </div>
          </div>

          {/* Payment */}
          <div className="fk-checkout-section">
            <div className="fk-checkout-section-title">💳 Payment Details <span className="fk-checkout-mock-badge">Simulated</span></div>
            <div className="fk-alert fk-alert--info" style={{ marginBottom: 14 }}>
              Mock form — enter any 16-digit number. No real charge will occur.
            </div>
            <div className="fk-fields-grid">
              <Field label="Cardholder Name *" name="cardName"   value={payment.cardName}   onChange={handlePayment} placeholder="Jane Doe"         err={fieldErrors.cardName} />
              <Field label="Card Number *"     name="cardNumber" value={payment.cardNumber} onChange={handlePayment} placeholder="1234 5678 9012 3456" err={fieldErrors.cardNumber} maxLength={16} />
              <Field label="Expiry (MM/YY) *"  name="expiry"     value={payment.expiry}     onChange={handlePayment} placeholder="MM/YY"              err={fieldErrors.expiry} maxLength={5} />
              <Field label="CVV *"             name="cvv"        value={payment.cvv}        onChange={handlePayment} placeholder="123"                err={fieldErrors.cvv} maxLength={4} />
            </div>
          </div>

          <button type="submit" className="fk-btn fk-btn-cart fk-checkout-place-btn" disabled={loading}>
            {loading ? 'Processing…' : `Place Order — ${formatINR(cartTotal)}`}
          </button>
        </div>

        {/* ── Right col — price summary ── */}
        <div className="fk-price-summary">
          <div className="fk-price-summary-header">PRICE DETAILS</div>
          {cartItems.map((item) => (
            <div key={item.product_id} className="fk-price-summary-row fk-price-summary-item">
              <span>{item.name} × {item.quantity}</span>
              <span>{formatINR(parseFloat(item.unit_price) * item.quantity)}</span>
            </div>
          ))}
          <div className="fk-price-summary-row">
            <span>Delivery Charges</span>
            <span className="fk-price-free">FREE</span>
          </div>
          <div className="fk-price-summary-divider" />
          <div className="fk-price-summary-row fk-price-summary-total">
            <span>Total Amount</span>
            <span>{formatINR(cartTotal)}</span>
          </div>
        </div>
      </form>
    </div>
  );
}
