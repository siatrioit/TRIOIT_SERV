#!/usr/bin/env node
/** Kopē version.json uz frontend un backend pirms build */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'version.json');
const payload = fs.readFileSync(source, 'utf8');
const targets = [
  path.join(root, 'frontend', 'src', 'app-version.json'),
  path.join(root, 'backend', 'src', 'app-version.json'),
];

for (const target of targets) {
  fs.writeFileSync(target, payload);
  console.log('sync-version:', path.relative(root, target));
}
