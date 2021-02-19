const { Order } = require('../models/orderModel');
const { Item } = require('../models/itemModel');
const { User } = require('../models/userModel');

module.exports = {
  createOrder: async (req, res) => {
    try {
      const resolvePrices = req.body.items.map(async ({ item, quantity }) => {
        const dbItem = await Item.findById(item);
        return {
          item,
          quantity,
          price: dbItem.currentPrice,
          priceReduction: 0,
        };
      }); // array of promises because of Item.findById
      const items = await Promise.all(resolvePrices);

      const order = new Order({
        items,
        user: req.user._id,
      });

      if (order) await order.save();

      // const user = await User.findById(req.user._id);
      // user.ordersHistory.push(order._id);
      // await user.save();
      // console.log(user.odersHistory);

      return res.status(201).send(order);
    } catch (error) {
      console.log('catch', error);
      res.status(400).send(error.message);
    }
  },

  getOrders: async (req, res) => {
    const filter = req.body;
    const isOwner = req.user.role === 'owner';

    const userFilter = isOwner ? {} : { user: req.user._id };

    const list = await Order.find({
      ...filter,
      ...userFilter,
    })
      .populate('user', ['email', 'name'])
      .populate({
        path: 'items.item',
        model: 'Item',
        select: ['name', 'price'],
      });

    res.status(200).send(list);
  },

  getOrder: async (req, res) => {
    res.status(200).send(req.order);
    console.log(req.data);
  },

  updateOrder: async ({ user, body, order }, res) => {
    try {
      const isOwner = user.role === 'owner';
      const forceUser = isOwner ? {} : { user: user._id };
      if (order) Object.assign(order, body, forceUser);
      await order.save();
      res.status(200).send(order);
    } catch (error) {
      console.error(error);
      return res.status(400).send(error.message);
    }
  },

  deleteOrder: async (req, res) => {
    try {
      await req.order.remove();
      res.status(200).send({ message: 'order deleted' });
    } catch (error) {
      res.status(400).send(error.message);
    }
  },

  placeOrder: async ({ order, body, user }, res) => {
    const { deliveryAddress, paymentMethod } = body;

    if (!deliveryAddress || !paymentMethod) {
      return res.status(400).send('Bad Request');
    }

    try {
      order.deliveryAddress = deliveryAddress;
      order.paymentMethod = paymentMethod;

      order.status = 'placed';

      await order.save();

      user.ordersHistory.push(order);

      let addressExists = false;

      for (savedAddress of user.savedDeliveryAddresses) {
        if (
          savedAddress.country === deliveryAddress.country &&
          savedAddress.address1 === deliveryAddress.address1 &&
          savedAddress.address2 === deliveryAddress.address2 &&
          savedAddress.city === deliveryAddress.city &&
          savedAddress.postcode === deliveryAddress.postcode
        )
          addressExists = true;
      }

      if (!addressExists) {
        user.savedDeliveryAddresses.push(deliveryAddress);
      }

      await user.save();

      return res.status(200).send(order);
    } catch (e) {
      console.error(e);
      return res.status(400).send('Bad Request');
    }
  },

  paymentConfirmed: async ({ body, order }, res) => {
    try {
      const { paymentStatus } = body;
      order.paymentStatus = paymentStatus;
      order.status = 'in-process';
      await order.save();
      return res.status(200).send(order);
    } catch (error) {
      res.status(400).send(error.message);
      console.log(error.message);
    }
  },

  createInvoice: async ({ order, body }, res) => {
    try {
      const { paymentStatus } = body;

      const invoice = Date.now();

      order.invoiceNumber = invoice;
      order.status = 'sent';
      await order.save();
      return res.status(200).send(order);
    } catch (error) {
      res.status(400).send(error.message);
      console.log(error.message);
    }
  },
  deliveredOrder: async ({ order, body }, res) => {
    try {
      const { delieveryStatus } = body;

      order.status = delieveryStatus;
      await order.save();

      return res.status(200).send({ message: 'product-delivered' });
    } catch (error) {
      res.status(400).send(error.message);
      console.log(error.message);
    }
  },
};
