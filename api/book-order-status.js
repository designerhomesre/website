'use strict';

const { runNetlifyHandler } = require('../vercel/lib/netlify-adapter');
const { handler } = require('../netlify/functions/book-order-status');

module.exports = function bookOrderStatus(req, res) {
  return runNetlifyHandler(req, res, handler);
};
