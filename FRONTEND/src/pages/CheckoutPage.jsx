import React, { useState } from 'react';
import { Form, Button, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { useCart } from '../context/CartContext';

const EMPTY_SHIPPING = { name: '', street: '', city: '', state: '', postcode: '', country: '' };
const EMPTY_PAYMENT = { cardName: '', cardNumber: '', expiry: '', cvv: '' };

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [shipping, setShipping] = useState(EMPTY_SHIPPING);
  const [payment, setPayment] = useState(EMPTY_PAYMENT);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted fs-5">Your cart is empty. Add some products first!</p>
        <Button href="/products" variant="primary">Browse Products</Button>
      </div>
    );
  }

  function handleShipping(e) {
    const { name, value } = e.target;
    setShipping((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function handlePayment(e) {
    const { name, value } = e.target;
    // Card number — digits only
    if (name === 'cardNumber') {
      const digits = value.replace(/\D/g, '').slice(0, 16);
      setPayment((prev) => ({ ...prev, cardNumber: digits }));
    } else if (name === 'expiry') {
      // Auto-format MM/YY
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      const formatted = cleaned.length > 2 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}` : cleaned;
      setPayment((prev) => ({ ...prev, expiry: formatted }));
    } else {
      setPayment((prev) => ({ ...prev, [name]: value }));
    }
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!shipping.name.trim()) errs.name = 'Full name is required.';
    if (!shipping.street.trim()) errs.street = 'Street address is required.';
    if (!shipping.city.trim()) errs.city = 'City is required.';
    if (!shipping.postcode.trim()) errs.postcode = 'Postcode is required.';
    if (!shipping.country.trim()) errs.country = 'Country is required.';
    if (!payment.cardName.trim()) errs.cardName = 'Cardholder name is required.';
    if (payment.cardNumber.length !== 16) errs.cardNumber = 'Card number must be 16 digits.';
    if (!/^\d{2}\/\d{2}$/.test(payment.expiry)) errs.expiry = 'Expiry must be MM/YY format.';
    if (!payment.cvv || payment.cvv.length < 3) errs.cvv = 'CVV is required (3–4 digits).';
    return errs;
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
        paymentDetails: {
          cardNumber: payment.cardNumber,
          expiry: payment.expiry,
          cvv: payment.cvv,
        },
      });
      clearCart();
      navigate(`/order-confirmation/${result.orderId}`);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="fw-bold mb-4">Checkout</h2>
      {apiError && <Alert variant="danger">{apiError}</Alert>}

      <Row>
        <Col lg={7}>
          <Form onSubmit={handleSubmit} noValidate>
            {/* Shipping */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="fw-semibold">📦 Shipping Address</Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control name="name" value={shipping.name} onChange={handleShipping}
                    isInvalid={!!fieldErrors.name} placeholder="Jane Doe" />
                  <Form.Control.Feedback type="invalid">{fieldErrors.name}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Street Address *</Form.Label>
                  <Form.Control name="street" value={shipping.street} onChange={handleShipping}
                    isInvalid={!!fieldErrors.street} placeholder="123 Main Street" />
                  <Form.Control.Feedback type="invalid">{fieldErrors.street}</Form.Control.Feedback>
                </Form.Group>
                <Row>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>City *</Form.Label>
                      <Form.Control name="city" value={shipping.city} onChange={handleShipping}
                        isInvalid={!!fieldErrors.city} placeholder="London" />
                      <Form.Control.Feedback type="invalid">{fieldErrors.city}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>State / Province</Form.Label>
                      <Form.Control name="state" value={shipping.state} onChange={handleShipping} placeholder="Optional" />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Postcode *</Form.Label>
                      <Form.Control name="postcode" value={shipping.postcode} onChange={handleShipping}
                        isInvalid={!!fieldErrors.postcode} placeholder="SW1A 1AA" />
                      <Form.Control.Feedback type="invalid">{fieldErrors.postcode}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country *</Form.Label>
                      <Form.Control name="country" value={shipping.country} onChange={handleShipping}
                        isInvalid={!!fieldErrors.country} placeholder="United Kingdom" />
                      <Form.Control.Feedback type="invalid">{fieldErrors.country}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Mock Payment */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="fw-semibold">
                💳 Payment Details
                <span className="badge bg-warning text-dark ms-2 small">Simulated — no real charge</span>
              </Card.Header>
              <Card.Body>
                <Alert variant="info" className="small py-2">
                  This is a <strong>mock payment form</strong>. Enter any 16-digit card number. No real transaction will occur.
                </Alert>
                <Form.Group className="mb-3">
                  <Form.Label>Cardholder Name *</Form.Label>
                  <Form.Control name="cardName" value={payment.cardName} onChange={handlePayment}
                    isInvalid={!!fieldErrors.cardName} placeholder="Jane Doe" />
                  <Form.Control.Feedback type="invalid">{fieldErrors.cardName}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Card Number *</Form.Label>
                  <Form.Control name="cardNumber" value={payment.cardNumber} onChange={handlePayment}
                    isInvalid={!!fieldErrors.cardNumber} placeholder="1234567890123456" maxLength={16} />
                  <Form.Control.Feedback type="invalid">{fieldErrors.cardNumber}</Form.Control.Feedback>
                </Form.Group>
                <Row>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Expiry (MM/YY) *</Form.Label>
                      <Form.Control name="expiry" value={payment.expiry} onChange={handlePayment}
                        isInvalid={!!fieldErrors.expiry} placeholder="MM/YY" maxLength={5} />
                      <Form.Control.Feedback type="invalid">{fieldErrors.expiry}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>CVV *</Form.Label>
                      <Form.Control name="cvv" value={payment.cvv} onChange={handlePayment}
                        isInvalid={!!fieldErrors.cvv} placeholder="123" maxLength={4} />
                      <Form.Control.Feedback type="invalid">{fieldErrors.cvv}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <div className="d-grid">
              <Button type="submit" variant="success" size="lg" disabled={loading}>
                {loading ? <><Spinner size="sm" animation="border" className="me-2" />Processing…</> : `Place Order — $${parseFloat(cartTotal).toFixed(2)}`}
              </Button>
            </div>
          </Form>
        </Col>

        {/* Order Summary */}
        <Col lg={5} className="mt-4 mt-lg-0">
          <Card className="shadow-sm">
            <Card.Header className="fw-semibold">🧾 Order Summary</Card.Header>
            <Card.Body>
              {cartItems.map((item) => (
                <div key={item.product_id} className="d-flex justify-content-between mb-2 small">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="fw-semibold">${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-5">
                <span>Total</span>
                <span className="text-primary">${parseFloat(cartTotal).toFixed(2)}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
