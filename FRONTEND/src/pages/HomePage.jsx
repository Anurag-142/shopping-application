import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Row, Col } from 'react-bootstrap';

export default function HomePage() {
  return (
    <div className="text-center py-5">
      <h1 className="display-4 fw-bold mb-3">Welcome to ShopApp 🛍️</h1>
      <p className="lead text-muted mb-4">
        Discover thousands of products across Electronics, Clothing, Books, Home & Kitchen, and Sports.
      </p>
      <Row className="justify-content-center">
        <Col xs="auto">
          <Button as={Link} to="/products" variant="primary" size="lg" className="me-3">
            Browse Products
          </Button>
          <Button as={Link} to="/signup" variant="outline-primary" size="lg">
            Create Account
          </Button>
        </Col>
      </Row>

      <Row className="mt-5 g-4 text-start">
        {[
          { icon: '🔒', title: 'Secure Checkout', text: 'Your data is protected with JWT auth and bcrypt-hashed passwords.' },
          { icon: '🚀', title: 'Fast Delivery', text: 'Place your order today and we will get it to you in no time.' },
          { icon: '↩️', title: 'Easy Returns', text: 'Not satisfied? Return any item within 30 days — no questions asked.' },
        ].map((feature) => (
          <Col key={feature.title} md={4}>
            <div className="p-4 bg-white rounded shadow-sm h-100">
              <div className="fs-1 mb-2">{feature.icon}</div>
              <h5 className="fw-semibold">{feature.title}</h5>
              <p className="text-muted small">{feature.text}</p>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}
