import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container, Badge, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { authService } from '../services/authService';

export default function Navbar() {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const { itemCount, clearCart } = useCart();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await authService.logout();
    } catch { /* ignore server error — still log out client side */ }
    logout();
    clearCart();
    navigate('/');
  }

  return (
    <BsNavbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container>
        <BsNavbar.Brand as={Link} to="/" className="fw-bold">
          🛍️ ShopApp
        </BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="main-nav" />
        <BsNavbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/products">Products</Nav.Link>
            {isAdmin && (
              <Nav.Link as={Link} to="/admin">Admin</Nav.Link>
            )}
          </Nav>
          <Nav className="align-items-center">
            {isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/orders">My Orders</Nav.Link>
                <Nav.Link as={Link} to="/cart" className="position-relative me-2">
                  🛒 Cart
                  {itemCount > 0 && (
                    <Badge bg="danger" pill className="position-absolute cart-badge">
                      {itemCount}
                    </Badge>
                  )}
                </Nav.Link>
                <span className="text-light me-3 small">Hi, {user?.name?.split(' ')[0]}</span>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">Login</Nav.Link>
                <Nav.Link as={Link} to="/signup">
                  <Button variant="primary" size="sm">Sign Up</Button>
                </Nav.Link>
              </>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}
