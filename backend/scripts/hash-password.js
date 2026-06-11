#!/usr/bin/env node
/** Lietošana: node scripts/hash-password.js "ManaParole123" */
const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) {
  console.error('Lietošana: node scripts/hash-password.js "parole"');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 12));
