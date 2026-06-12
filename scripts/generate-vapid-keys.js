/**
 * VAPID atslēgas Web Push (PWA).
 * Palaid bez npx/npm:
 *   node scripts/generate-vapid-keys.js
 *
 * Windows (ja node nav PATH):
 *   & "C:\Program Files\nodejs\node.exe" scripts/generate-vapid-keys.js
 */
const crypto = require('crypto');

function urlBase64(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();

const publicKey = urlBase64(ecdh.getPublicKey());
const privateKey = urlBase64(ecdh.getPrivateKey());

console.log('');
console.log('Ieliec cPanel → Setup Node.js App → Environment variables:');
console.log('');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:admin@trioit.lv');
console.log('');
console.log('Pēc tam: Save → Restart');
console.log('');
