'use strict';

const { runNetlifyHandler } = require('../vercel/lib/netlify-adapter');
const { handler } = require('../netlify/functions/book-stripe-webhook');

module.exports = function bookStripeWebhook(req, res) {
  return runNetlifyHandler(req, res, handler, { rawBody: true });
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};
