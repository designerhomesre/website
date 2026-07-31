'use strict';

const { runNetlifyHandler } = require('../vercel/lib/netlify-adapter');
const { handler } = require('../netlify/functions/book-admin');

module.exports = function bookAdmin(req, res) {
  return runNetlifyHandler(req, res, handler);
};
