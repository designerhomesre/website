'use strict';

const { runNetlifyHandler } = require('../vercel/lib/netlify-adapter');
const { handler } = require('../netlify/functions/create-book-checkout');

module.exports = function createBookCheckout(req, res) {
  return runNetlifyHandler(req, res, handler);
};
