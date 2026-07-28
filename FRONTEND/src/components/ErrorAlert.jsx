import React from 'react';
import { Alert } from 'react-bootstrap';

export default function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <Alert variant="danger" dismissible={!!onDismiss} onClose={onDismiss}>
      {message}
    </Alert>
  );
}
