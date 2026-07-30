import React, { useState, useEffect } from 'react';
import { formatINR } from '../utils/formatCurrency';
import { orderService } from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_COLOR = {
  pending:    { bg: '#fff3cd', text: '#856404' },
  processing: { bg: '#cce5ff', text: '#004085' },
  shipped:    { bg: '#d1ecf1', text: '#0c5460' },
  delivered:  { bg: '#d4edda', text: '#155724' },
  cancelled:  { bg: '#f8d7da', text: '#721c24' },
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    orderService.getOrders()
      .then(setOrders)
      .catch(() => setError('Could not load orders.'))
      .finally(() => setLoading(false));
  }, []);

  async function toggleDetail(orderId) {
    if (expandedOrder === orderId) { setExpandedOrder(null); return; }
    setExpandedOrder(orderId);
    if (orderDetail[orderId]) return;
    setDetailLoading(true);
    try {
      const detail = await orderService.getOrderDetail(orderId);
      setOrderDetail((prev) => ({ ...prev, [orderId]: detail }));
    } catch {
      setError('Could not load order details.');
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="fk-orders-page">
      <h2 className="fk-orders-title">My Orders</h2>
      {error && <div className="fk-alert fk-alert--danger">{error}</div>}

      {orders.length === 0 ? (
        <div className="fk-cart-empty">
          <div className="fk-cart-empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Looks like you have not ordered anything yet.</p>
          <a href="/products" className="fk-btn fk-btn-cart" style={{ display: 'inline-block', padding: '12px 32px' }}>
            Start Shopping
          </a>
        </div>
      ) : (
        <div className="fk-orders-list">
          {orders.map((order) => {
            const sc = STATUS_COLOR[order.status] || { bg: '#eee', text: '#333' };
            return (
              <div key={order.id} className="fk-order-card">
                <div className="fk-order-card-header">
                  <div className="fk-order-meta">
                    <span className="fk-order-id">Order #{order.id}</span>
                    <span className="fk-order-date">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="fk-order-right">
                    <span className="fk-order-amount">{formatINR(order.total_amount)}</span>
                    <span className="fk-order-status" style={{ background: sc.bg, color: sc.text }}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <button className="fk-order-details-btn" onClick={() => toggleDetail(order.id)}>
                      {expandedOrder === order.id ? 'Hide Details ▲' : 'View Details ▼'}
                    </button>
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="fk-order-detail">
                    {detailLoading && !orderDetail[order.id] ? (
                      <p className="fk-order-detail-loading">Loading…</p>
                    ) : orderDetail[order.id] ? (
                      <>
                        <table className="fk-order-items-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Qty</th>
                              <th>Unit Price</th>
                              <th>Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderDetail[order.id].items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.name}</td>
                                <td>{item.quantity}</td>
                                <td>{formatINR(item.unit_price)}</td>
                                <td>{formatINR(parseFloat(item.unit_price) * item.quantity)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="fk-order-shipped-to">
                          📦 Shipped to: {orderDetail[order.id].shipping_name},{' '}
                          {orderDetail[order.id].shipping_city},{' '}
                          {orderDetail[order.id].shipping_country}
                        </p>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
