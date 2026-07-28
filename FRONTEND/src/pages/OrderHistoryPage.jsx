import React, { useState, useEffect } from 'react';
import { Table, Badge, Button, Alert, Collapse, Card } from 'react-bootstrap';
import { orderService } from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_VARIANT = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'danger',
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
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(orderId);
    if (orderDetail[orderId]) return; // already fetched
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
    <div>
      <h2 className="fw-bold mb-4">My Orders</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      {orders.length === 0 ? (
        <p className="text-muted">You have not placed any orders yet.</p>
      ) : (
        <Table responsive hover>
          <thead className="table-light">
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <React.Fragment key={order.id}>
                <tr>
                  <td className="fw-semibold">#{order.id}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="fw-semibold">${parseFloat(order.total_amount).toFixed(2)}</td>
                  <td>
                    <Badge bg={STATUS_VARIANT[order.status] || 'secondary'} className="text-capitalize">
                      {order.status}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="link" size="sm" className="p-0 text-decoration-none"
                      onClick={() => toggleDetail(order.id)}>
                      {expandedOrder === order.id ? 'Hide ▲' : 'View Details ▼'}
                    </Button>
                  </td>
                </tr>
                {expandedOrder === order.id && (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <Collapse in>
                        <div className="p-3 bg-light">
                          {detailLoading && !orderDetail[order.id] ? (
                            <p className="small text-muted">Loading…</p>
                          ) : orderDetail[order.id] ? (
                            <>
                              <Table size="sm" className="mb-2">
                                <thead>
                                  <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr>
                                </thead>
                                <tbody>
                                  {orderDetail[order.id].items.map((item) => (
                                    <tr key={item.id}>
                                      <td>{item.name}</td>
                                      <td>{item.quantity}</td>
                                      <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                                      <td>${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                              <p className="small text-muted mb-0">
                                Shipped to: {orderDetail[order.id].shipping_name},{' '}
                                {orderDetail[order.id].shipping_city},{' '}
                                {orderDetail[order.id].shipping_country}
                              </p>
                            </>
                          ) : null}
                        </div>
                      </Collapse>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
