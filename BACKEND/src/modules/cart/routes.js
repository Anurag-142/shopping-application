const { Router } = require('express');
const jwtVerify = require('../../middleware/jwtVerify');
const controller = require('./controller');

const router = Router();

// All cart routes require authentication
router.use(jwtVerify);

router.get('/', controller.getCart);
router.post('/', controller.addItem);
router.put('/:productId', controller.updateItem);
router.delete('/:productId', controller.removeItem);
router.delete('/', controller.clearCart);

module.exports = router;
