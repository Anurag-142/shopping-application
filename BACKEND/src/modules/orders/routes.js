const { Router } = require('express');
const jwtVerify = require('../../middleware/jwtVerify');
const controller = require('./controller');

const router = Router();

router.use(jwtVerify);

router.post('/', controller.createOrder);
router.get('/', controller.listOrders);
router.get('/:orderId', controller.getOrderDetail);

module.exports = router;
