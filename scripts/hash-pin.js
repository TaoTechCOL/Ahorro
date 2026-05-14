// scripts/hash-pin.js
// Uso: node scripts/hash-pin.js 1234
// Copia el hash resultante y pégalo como PIN_HASH en las env vars de Vercel.

import bcrypt from 'bcryptjs';

const pin = process.argv[2];
if (!pin) {
  console.error('Uso: node scripts/hash-pin.js TU_PIN');
  process.exit(1);
}

const hash = await bcrypt.hash(String(pin), 10);
console.log('\n=== Pega este valor en Vercel como PIN_HASH ===\n');
console.log(hash);
console.log('\n');
