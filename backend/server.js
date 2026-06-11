'use strict';
/**
 * cPanel Passenger startup (alternatīva dist/index.js).
 * Application startup file: server.js
 */
module.exports = require('./dist/index.js').default || require('./dist/index.js');
