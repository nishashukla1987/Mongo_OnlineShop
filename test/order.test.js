/**
 * @jest-environment node
 */

const axios = require('axios');
axios.defaults.baseURL = 'http://127.0.0.1:5002/';

const { db } = require('../db');
const { User } = require('../models/userModel');
const { Item } = require('../models/itemModel');
const { Order } = require('../models/orderModel');

const email = Date.now() + '@nishaEmail.order';

let item, secondItem, user;

beforeAll(async () => {
  const res = await register(email, 'asdasldkjas', 'nisha', 'shukla');
  axios.defaults.headers.common.authorization = res.data.token;

  user = await User.findOne({ email });
  user.role = 'owner';
  await user.save();

  const createRes = await createItem({
    name: 'order-test-item',
    categoryLevel1: 'C.L. 1.1',
    categoryLevel2: 'C.L. 2.1',
    categoryLevel3: 'C.L. 3.1',
    currentPrice: 15,
    discountCategory: 'none',
  });
  item = createRes.data;

  const createRes1 = await createItem({
    name: 'order-test-secondItem',
    categoryLevel1: 'C.L. 1.1',
    categoryLevel2: 'C.L. 2.1',
    categoryLevel3: 'C.L. 3.1',
    currentPrice: 15,
    discountCategory: 'none',
  });
  secondItem = createRes1.data;
});

afterAll(async () => {
  await User.deleteOne({ email });
  await Item.deleteOne({ name: 'order-test-item' });
  await Item.deleteOne({ name: 'order-test-secondItem' });
  await Order.deleteMany({ user: user._id });
  db.close();
});

function createItem(
  name,
  categoryLevel1,
  categoryLevel2,
  categoryLevel3,
  currentPrice,
  discountCategory
) {
  return axios.post(
    '/items/',
    name,
    categoryLevel1,
    categoryLevel2,
    categoryLevel3,
    currentPrice,
    discountCategory
  );
}

function register(email, password, firstName, lastName) {
  return axios.post('/users/register', {
    email,
    password,
    firstName,
    lastName,
  });
}

function create(items) {
  return axios.post('/orders/', items);
}

function get(id) {
  return axios.get(`/orders/${id}`);
}

function getList(filters = {}) {
  return axios.get('/orders/list', filters);
}

function update(id, order = {}) {
  return axios.patch(`/orders/${id}`, order);
}

function remove(id) {
  return axios.delete(`/orders/${id}`);
}

function createExampleOrder() {
  return create({
    items: [
      { item: item._id, quantity: 45, price: 34, priceReduction: 21 },
      { item: secondItem._id, quantity: 12, price: 32, priceReduction: 12 },
    ],
  });
}

function place(id, deliveryAddress, paymentMethod) {
  return axios.post(`/orders/${id}/place`, { deliveryAddress, paymentMethod });
}

function payment(id, paymentStatus) {
  return axios.post(`/orders/${id}/paid`, paymentStatus);
}

function invoice(id, paymentStatus) {
  return axios.post(`/orders/${id}/confirmed`, paymentStatus);
}

function dispatch(id, paymentStatus) {
  return axios.post(`/orders/${id}/delivered`, paymentStatus);
}

test('simple create order', async () => {
  const createRes = await create({
    items: [{ item: item._id, quantity: 45, price: 0, priceReduction: 0 }],
  });
  expect(createRes.data.items.length).toEqual(1);
  expect(createRes.data.items[0].price).toEqual(item.currentPrice);
});

test('should get single order', async () => {
  const createRes = await create({
    items: [
      { item: item._id, quantity: 45, price: 34, priceReduction: 21 },
      { item: secondItem._id, quantity: 45, price: 30, priceReduction: 21 },
    ],
  });

  const getRes = await get(createRes.data._id);
  //console.log(getRes.data);

  expect(getRes.data.user._id).toMatch(user._id.toString());
  expect(getRes.data.items[0].item._id).toMatch(item._id);
  expect(getRes.data.items[1].item._id).toMatch(secondItem._id);
  expect(getRes.data.items[1].price).toEqual(secondItem.currentPrice);
  expect(getRes.data.items.length).toEqual(2);
});

test('list of order', async () => {
  const listRes = await getList({ date: { $gt: 0 } });

  expect(listRes.data.length).toBeGreaterThan(0);
});

test('should update order', async () => {
  const createRes = await create({
    items: [{ item: item._id, quantity: 45, price: 34, priceReduction: 21 }],
  });
  const getRes = await update(createRes.data._id, { items: [{ price: 20 }] });
  expect(getRes.data.items[0].price).toBe(20);
});

test('should delete item', async () => {
  const createRes = await create({
    items: [{ item: item._id, quantity: 45, price: 34, priceReduction: 21 }],
  });
  const getRes = await remove(createRes.data._id);
  expect(getRes.status).toBe(200);
  await expect(get(createRes.data._id)).rejects.toThrow();
});

const testAddress = {
  country: 'Germany',
  address1: 'Fakestrasse 77',
  city: 'Düsseldorf',
  postcode: 40333,
};

test('should be able to place an order', async () => {
  const createRes = await createExampleOrder();
  const placeRes = await place(createRes.data._id, testAddress, {
    provider: 'paypal',
  });
  const updatedUser = await User.findById(user._id);
  expect(placeRes.data.status).toMatch('placed');
  expect(updatedUser.savedDeliveryAddresses.pop().address1).toMatch(
    testAddress.address1
  );
});

test('should not be able to place an order twice', async () => {
  const createRes = await createExampleOrder();
  await place(createRes.data._id, testAddress, { provider: 'paypal' });
  await expect(
    place(createRes.data._id, testAddress, { provider: 'paypal' })
  ).rejects.toThrow();
});

test('should able to change payment status on confirmation', async () => {
  const createRes = await createExampleOrder();
  const placeRes = await place(createRes.data._id, testAddress, {
    provider: 'paypal',
  });

  const paymentRes = await payment(placeRes.data._id, {
    paymentStatus: 'paid-in-full',
  });
  expect(paymentRes.data.paymentStatus).toMatch('paid-in-full');
});

test('should give invoice number', async () => {
  const createRes = await createExampleOrder();
  const placeRes = await place(createRes.data._id, testAddress, {
    provider: 'paypal',
  });

  const paymentRes = await payment(placeRes.data._id, {
    paymentStatus: 'paid-in-full',
  });
  const invoiceRes = await invoice(paymentRes.data._id);

  expect(invoiceRes.data.invoiceNumber).toMatch('');
});

test('should give delievery status', async () => {
  const createRes = await createExampleOrder();
  const placeRes = await place(createRes.data._id, testAddress, {
    provider: 'paypal',
  });

  const paymentRes = await payment(placeRes.data._id, {
    paymentStatus: 'paid-in-full',
  });
  const invoiceRes = await invoice(paymentRes.data._id);
  const dispatchRes = await dispatch(invoiceRes.data._id, 'delivered');

  expect(dispatchRes.data.message).toMatch('product-delivered');
});
