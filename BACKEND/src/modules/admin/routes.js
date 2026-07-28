const { Router } = require('express');
const jwtVerify = require('../../middleware/jwtVerify');
const roleGuard = require('../../middleware/roleGuard');
const controller = require('./controller');

const router = Router();

// All admin routes require a valid JWT AND admin role
router.use(jwtVerify, roleGuard('admin'));

router.get('/products', controller.listProducts);
router.post('/products', controller.createProduct);
router.put('/products/:id', controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);

module.exports = router;
