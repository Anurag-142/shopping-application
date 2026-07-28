import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * Reusable product card shown in the product listing grid.
 */
export default function ProductCard({ product, onAddToCart, addingId }) {
  const isOutOfStock = product.stock_qty === 0;
  const isAdding = addingId === product.id;

  return (
    <Card className="h-100 product-card shadow-sm">
      <Card.Img
        variant="top"
        src={product.image_url || 'https://via.placeholder.com/400x200?text=No+Image'}
        alt={product.name}
        className="product-card-img"
        onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=No+Image'; }}
      />
      <Card.Body className="d-flex flex-column">
        <div className="mb-1">
          {product.category_name && (
            <Badge bg="secondary" className="me-1 mb-1 small">{product.category_name}</Badge>
          )}
          {isOutOfStock && <Badge bg="warning" text="dark" className="small">Out of Stock</Badge>}
        </div>
        <Card.Title className="fs-6 fw-semibold">{product.name}</Card.Title>
        <Card.Text className="text-primary fw-bold fs-5 mt-auto mb-2">
          ${parseFloat(product.price).toFixed(2)}
        </Card.Text>
        <div className="d-flex gap-2">
          <Button
            as={Link}
            to={`/products/${product.id}`}
            variant="outline-secondary"
            size="sm"
            className="flex-grow-1"
          >
            Details
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-grow-1"
            disabled={isOutOfStock || isAdding}
            onClick={() => onAddToCart(product)}
          >
            {isAdding ? '…' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
