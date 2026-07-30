import React, { useState, useEffect } from 'react';
import { formatINR } from '../utils/formatCurrency';
import { useParams, Link } from 'react-router-dom';
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
  if (error) return <div className="fk-section"><div className="fk-alert fk-alert--danger">{error}</div></div>;

  return (
    <div className="fk-confirm-page">
      {/* Success banner */}
      <div className="fk-confirm-banner">
        <span className="fk-confirm-check">✓</span>
        <div>
          <h2 className="fk-confirm-title">Order Confirmed!</h2>
          <p className="fk-confirm-sub">Your order <strong>#{order.id}</strong> has been placed successfully.</p>
          <p className="fk-confirm-txn">Transaction ID: {order.transaction_id}</p>
        </div>
      </div>

      {/* Items table */}
      <div className="fk-confirm-card">
        <div className="fk-confirm-card-title">Order Items</div>
        <table className="fk-order-items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatINR(item.unit_price)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(parseFloat(item.unit_price) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fk-confirm-total-row">
              <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Order Total</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: '#2874f0' }}>{formatINR(order.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Shipping address */}
      <div className="fk-confirm-card">
        <div className="fk-confirm-card-title">Delivery Address</div>
        <p className="fk-confirm-addr">{order.shipping_name}</p>
        <p className="fk-confirm-addr">{order.shipping_street}</p>
        <p className="fk-confirm-addr">{order.shipping_city}{order.shipping_state ? `, ${order.shipping_state}` : ''} — {order.shipping_postcode}</p>
        <p className="fk-confirm-addr">{order.shipping_country}</p>
      </div>

      {/* Actions */}
      <div className="fk-confirm-actions">
        <Link to="/products" className="fk-btn fk-btn-cart">Continue Shopping</Link>
        <Link to="/orders" className="fk-btn fk-btn-buy">View All Orders</Link>
      </div>
    </div>
  );
}
