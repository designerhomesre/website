'use strict';

const { runNetlifyHandler } = require('../vercel/lib/netlify-adapter');
const { handler } = require('../netlify/functions/book-download');

module.exports = function bookDownload(req, res) {
  return runNetlifyHandler(req, res, handler);
};
