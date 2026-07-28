import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, Card, Table, Button } from 'react-bootstrap';
import { orderService } from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    orderService.getOrderDetail(orderId)
      .then(setOrder)
      .catch(() => setError('Could not load order details.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="py-4">
      <div className="text-center mb-4">
        <div className="display-4">✅</div>
        <h2 className="fw-bold mt-2">Order Confirmed!</h2>
        <p className="text-muted">Thank you for your order. Your order ID is <strong>#{order.id}</strong>.</p>
        <p className="small text-muted">Transaction ID: {order.transaction_id}</p>
      </div>

      <Card className="mb-4 shadow-sm">
        <Card.Header className="fw-semibold">Order Items</Card.Header>
        <Card.Body className="p-0">
          <Table className="mb-0" responsive>
            <thead className="table-light">
              <tr>
                <th>Product</th>
                <th className="text-center">Qty</th>
                <th className="text-end">Price</th>
                <th className="text-end">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-end">${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td className="text-end fw-semibold">${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-end fw-bold">Order Total</td>
                <td className="text-end fw-bold text-primary fs-5">${parseFloat(order.total_amount).toFixed(2)}</td>
              </tr>
            </tfoot>
          </Table>
        </Card.Body>
      </Card>

      <Card className="mb-4 shadow-sm">
        <Card.Header className="fw-semibold">Shipping Address</Card.Header>
        <Card.Body>
          <p className="mb-0">{order.shipping_name}</p>
          <p className="mb-0">{order.shipping_street}</p>
          <p className="mb-0">{order.shipping_city}{order.shipping_state ? `, ${order.shipping_state}` : ''}</p>
          <p className="mb-0">{order.shipping_postcode}, {order.shipping_country}</p>
        </Card.Body>
      </Card>

      <div className="d-flex gap-3 justify-content-center">
        <Button as={Link} to="/products" variant="primary">Continue Shopping</Button>
        <Button as={Link} to="/orders" variant="outline-secondary">View All Orders</Button>
      </div>
    </div>
  );
}
