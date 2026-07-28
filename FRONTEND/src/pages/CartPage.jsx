import React from 'react';
import { Table, Button, Alert, Row, Col } from 'react-bootstrap';
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
      <div className="text-center py-5">
        <p className="fs-4 text-muted">Your cart is empty.</p>
        <Button as={Link} to="/products" variant="primary">Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="fw-bold mb-4">Shopping Cart</h2>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Table responsive hover className="align-middle">
        <thead className="table-light">
          <tr>
            <th>Product</th>
            <th className="text-center">Price</th>
            <th className="text-center">Quantity</th>
            <th className="text-center">Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((item) => (
            <tr key={item.product_id}>
              <td>
                <div className="d-flex align-items-center gap-3">
                  <img
                    src={item.image_url || 'https://via.placeholder.com/60'}
                    alt={item.name}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/60'; }}
                  />
                  <span className="fw-semibold small">{item.name}</span>
                </div>
              </td>
              <td className="text-center">${parseFloat(item.unit_price).toFixed(2)}</td>
              <td className="text-center">
                <div className="d-flex align-items-center justify-content-center border rounded" style={{ width: 110, margin: '0 auto' }}>
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                    disabled={loadingId === item.product_id}
                  >−</Button>
                  <span className="px-2 fw-semibold">{item.quantity}</span>
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                    disabled={loadingId === item.product_id || item.quantity >= item.stock_qty}
                  >+</Button>
                </div>
              </td>
              <td className="text-center fw-semibold">
                ${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
              </td>
              <td className="text-end">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleRemove(item.product_id)}
                  disabled={loadingId === item.product_id}
                >
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Row className="justify-content-end mt-3">
        <Col md={4}>
          <div className="bg-light rounded p-3">
            <div className="d-flex justify-content-between mb-2">
              <span>Subtotal</span>
              <span className="fw-semibold">${parseFloat(cartTotal).toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between fw-bold fs-5 border-top pt-2">
              <span>Total</span>
              <span className="text-primary">${parseFloat(cartTotal).toFixed(2)}</span>
            </div>
            <Button
              variant="primary"
              className="w-100 mt-3"
              onClick={() => navigate('/checkout')}
            >
              Proceed to Checkout
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
}
