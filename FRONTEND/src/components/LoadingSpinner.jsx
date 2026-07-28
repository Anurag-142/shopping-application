import React from 'react';
import { Spinner } from 'react-bootstrap';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="spinner-overlay">
      <div className="text-center text-muted">
        <Spinner animation="border" role="status" />
        <p className="mt-2 small">{message}</p>
      </div>
    </div>
  );
}
