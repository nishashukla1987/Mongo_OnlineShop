/**
 * @jest-environment node
 */
const { db } = require('../db');
const { User } = require('../models/userModel');

beforeAll(async () => {});

afterAll(async () => {
  for (const email of emails) {
    await User.deleteOne({ email });
  }
  db.close();
});

const axios = require('axios');
axios.defaults.baseURL = 'http://127.0.0.1:5002/';

const emails = [];

function register(email, password, firstName, lastName) {
  emails.push(email);
  return axios.post('/users/register', {
    email,
    password,
    firstName,
    lastName,
  });
}

test('simple registration should work', async () => {
  await register('nishaEmail', 'asdasldkjas', 'nisha', 'shukla');
});

test('registration should return a token', async () => {
  const res = await register('nishaEmail1', 'asdasldkjas', 'nisha', 'shukla');
  //console.log(res.data);
  expect(res.data.token).toBeTruthy();
});

function login(email, password) {
  return axios.post('/users/login', { email, password });
}

function logout(token) {
  return axios.post('users/logout', null, {
    headers: { authorization: token },
  });
}

function unregister(token) {
  return axios.post('users/unregister', null, {
    headers: { authorization: token },
  });
}

test('login should work / return a token', async () => {
  const res = await login('nishaEmail', 'asdasldkjas');
  expect(res.data.token).toBeTruthy();
});

test('logout should work', async () => {
  const registerRes = await register(
    'nishaEmail2',
    'asdasldkjas',
    'nisha',
    'shukla'
  );
  const loginRes = await login('nishaEmail2', 'asdasldkjas');
  const logoutRes = await logout(loginRes.data.token);
});

test('unregister should work', async () => {
  const loginRes = await register(
    'nishaEmail3',
    'asdasldkjas',
    'nisha',
    'shukla'
  );
  const unregisterRes = await unregister(loginRes.data.token);
});
