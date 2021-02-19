const express = require('express');

const router = express.Router();
const {
  checkAuth,
  checkOrderUserOrOwner,
  canOrderProceedTo,
} = require('../middlewares');

router.use(checkAuth);

const {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  placeOrder,
  paymentConfirmed,
  createInvoice,
  deliveredOrder,
} = require('../controllers/orderControllers');

router.post('/', createOrder);

router.get('/list', getOrders);

router.get('/:id', checkOrderUserOrOwner, getOrder);

router.patch('/:id', checkOrderUserOrOwner, updateOrder);

router.delete('/:id', checkOrderUserOrOwner, deleteOrder);

router.post(
  '/:id/place',
  [checkOrderUserOrOwner, canOrderProceedTo('placed')],
  placeOrder
);

// owner, accounting, some moneyguy
router.post(
  '/:id/paid',
  [checkOrderUserOrOwner, canOrderProceedTo('in-process')],
  paymentConfirmed
);

router.post(
  '/:id/confirmed',
  [checkOrderUserOrOwner, canOrderProceedTo('sent')],
  createInvoice
);

router.post('/:id/dispatched');

router.post(
  '/:id/delivered',
  [checkOrderUserOrOwner, canOrderProceedTo('delivered')],
  deliveredOrder
);

module.exports = router;
