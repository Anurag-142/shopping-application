import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatINR } from '../utils/formatCurrency';
import {
  Table, Button, Badge, Alert, Modal, Form, Row, Col, Spinner,
} from 'react-bootstrap';
import { adminService } from '../services/adminService';
import { productService } from '../services/productService';

const EMPTY_FORM = {
  name: '', description: '', price: '', category_id: '', image_url: '', stock_qty: '', is_active: true,
};

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = add, object = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Bulk import state ──────────────────────────────────────────────────────
  const [showBulk, setShowBulk] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const fileRef = useRef(null);

  async function handleBulkImport() {
    setBulkError('');
    let parsed;
    try {
      parsed = JSON.parse(bulkJson);
    } catch {
      setBulkError('Invalid JSON. Please fix and try again.');
      return;
    }
    // Accept array directly or { products: [...] }
    const list = Array.isArray(parsed) ? parsed : parsed.products;
    if (!Array.isArray(list) || list.length === 0) {
      setBulkError('JSON must be an array of product objects (or { products: [...] }).');
      return;
    }
    setBulkLoading(true);
    try {
      const result = await adminService.bulkCreate(list);
      setSuccess(`✅ Bulk import complete — ${result.created} product${result.created !== 1 ? 's' : ''} added.`);
      setShowBulk(false);
      setBulkJson('');
      fetchProducts(1);
    } catch (err) {
      setBulkError(err.response?.data?.error || 'Bulk import failed.');
    } finally {
      setBulkLoading(false);
    }
  }

  function handleBulkFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBulkJson(ev.target.result);
    reader.readAsText(file);
  }

  const BULK_TEMPLATE = JSON.stringify([
    { name: 'Example Product', description: 'A great product', price: 999, category_id: 1, image_url: '', stock_qty: 50 },
  ], null, 2);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getProducts({ page, limit: 20 });
      setProducts(data.products);
      setPagination(data.pagination);
    } catch {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => {});
    fetchProducts(1);
  }, [fetchProducts]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      category_id: product.category_id ? String(product.category_id) : '',
      image_url: product.image_url || '',
      stock_qty: String(product.stock_qty),
      is_active: product.is_active,
    });
    setFormErrors({});
    setShowModal(true);
  }

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validateForm() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) {
      errs.price = 'Valid price is required.';
    }
    if (form.stock_qty !== '' && (isNaN(parseInt(form.stock_qty, 10)) || parseInt(form.stock_qty, 10) < 0)) {
      errs.stock_qty = 'Stock must be a non-negative number.';
    }
    return errs;
  }

  async function handleSave() {
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category_id: form.category_id ? parseInt(form.category_id, 10) : null,
        image_url: form.image_url.trim(),
        stock_qty: form.stock_qty !== '' ? parseInt(form.stock_qty, 10) : 0,
        is_active: form.is_active,
      };

      if (editing) {
        await adminService.updateProduct(editing.id, payload);
        setSuccess(`Product "${payload.name}" updated.`);
      } else {
        await adminService.createProduct(payload);
        setSuccess(`Product "${payload.name}" created.`);
      }
      setShowModal(false);
      fetchProducts(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(product) {
    if (!window.confirm(`Deactivate "${product.name}"? It will be hidden from customers.`)) return;
    try {
      await adminService.deleteProduct(product.id);
      setSuccess(`"${product.name}" deactivated.`);
      fetchProducts(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not deactivate product.');
    }
  }

  async function handleActivate(product) {
    try {
      await adminService.updateProduct(product.id, { is_active: true });
      setSuccess(`"${product.name}" reactivated.`);
      fetchProducts(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reactivate product.');
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Admin — Product Management</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={() => { setBulkJson(BULK_TEMPLATE); setShowBulk(true); }}>
            ⬆ Bulk Import
          </Button>
          <Button variant="primary" onClick={openAdd}>+ Add Product</Button>
        </div>
      </div>

      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table responsive hover>
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className={!product.is_active ? 'admin-inactive' : ''}>
                <td className="text-muted small">#{product.id}</td>
                <td className="fw-semibold">{product.name}</td>
                <td><span className="badge bg-secondary">{product.category_name || '—'}</span></td>
                <td>{formatINR(product.price)}</td>
                <td>
                  <span className={product.stock_qty === 0 ? 'text-danger fw-semibold' : ''}>
                    {product.stock_qty}
                  </span>
                </td>
                <td>
                  <Badge bg={product.is_active ? 'success' : 'secondary'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td>
                  <Button variant="outline-primary" size="sm" className="me-1"
                    onClick={() => openEdit(product)}>Edit</Button>
                  {product.is_active ? (
                    <Button variant="outline-warning" size="sm"
                      onClick={() => handleDeactivate(product)}>Deactivate</Button>
                  ) : (
                    <Button variant="outline-success" size="sm"
                      onClick={() => handleActivate(product)}>Activate</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="d-flex gap-2 justify-content-center mt-3">
          <Button size="sm" variant="outline-secondary" disabled={pagination.page === 1}
            onClick={() => fetchProducts(pagination.page - 1)}>Previous</Button>
          <span className="align-self-center small text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button size="sm" variant="outline-secondary" disabled={pagination.page === pagination.totalPages}
            onClick={() => fetchProducts(pagination.page + 1)}>Next</Button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit Product' : 'Add New Product'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form noValidate>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Product Name *</Form.Label>
                  <Form.Control name="name" value={form.name} onChange={handleFormChange}
                    isInvalid={!!formErrors.name} placeholder="e.g. Wireless Headphones" />
                  <Form.Control.Feedback type="invalid">{formErrors.name}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="category_id" value={form.category_id} onChange={handleFormChange}>
                    <option value="">— No category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} name="description" value={form.description}
                onChange={handleFormChange} placeholder="Product description…" />
            </Form.Group>

            <Row>
              <Col sm={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Price (₹) *</Form.Label>
                  <Form.Control type="number" step="0.01" min="0" name="price" value={form.price}
                    onChange={handleFormChange} isInvalid={!!formErrors.price} placeholder="29.99" />
                  <Form.Control.Feedback type="invalid">{formErrors.price}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col sm={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Stock Quantity</Form.Label>
                  <Form.Control type="number" min="0" name="stock_qty" value={form.stock_qty}
                    onChange={handleFormChange} isInvalid={!!formErrors.stock_qty} placeholder="0" />
                  <Form.Control.Feedback type="invalid">{formErrors.stock_qty}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col sm={4} className="d-flex align-items-end mb-3">
                <Form.Check type="switch" id="is_active" name="is_active"
                  label="Active (visible to customers)"
                  checked={form.is_active} onChange={handleFormChange} />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Image URL</Form.Label>
              <Form.Control name="image_url" value={form.image_url} onChange={handleFormChange}
                placeholder="https://example.com/image.jpg" />
              {form.image_url && (
                <img src={form.image_url} alt="preview" className="mt-2 rounded"
                  style={{ maxHeight: 120, objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Spinner size="sm" animation="border" className="me-1" />Saving…</> : (editing ? 'Save Changes' : 'Create Product')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Bulk Import Modal ── */}
      <Modal show={showBulk} onHide={() => setShowBulk(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>⬆ Bulk Import Products</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="small py-2 mb-3">
            Paste a JSON array of products below, or upload a <code>.json</code> file.
            Maximum <strong>200 products</strong> per import. Each product needs at minimum
            <code> name</code> and <code>price</code>.
          </Alert>

          {bulkError && <Alert variant="danger">{bulkError}</Alert>}

          <div className="mb-3">
            <Form.Label className="fw-semibold">Upload JSON file</Form.Label>
            <Form.Control type="file" accept=".json" ref={fileRef} onChange={handleBulkFile} />
          </div>

          <Form.Group>
            <Form.Label className="fw-semibold">Or paste JSON directly</Form.Label>
            <Form.Control
              as="textarea"
              rows={12}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder='[{ "name": "Product", "price": 999, "stock_qty": 10 }]'
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </Form.Group>

          <Alert variant="secondary" className="small mt-3 py-2">
            <strong>Available fields:</strong>{' '}
            <code>name*</code>, <code>price*</code>, <code>description</code>,{' '}
            <code>category_id</code>, <code>image_url</code>, <code>stock_qty</code>, <code>is_active</code>
            <br />
            <strong>Category IDs:</strong>{' '}
            {categories.map((c) => `${c.id}=${c.name}`).join(' · ')}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulk(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleBulkImport} disabled={bulkLoading || !bulkJson.trim()}>
            {bulkLoading
              ? <><Spinner size="sm" animation="border" className="me-1" />Importing…</>
              : 'Import Products'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
