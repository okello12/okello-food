'use strict';

const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('recovery.html','utf8');

assert.ok(src.includes('serviceWorker.getRegistrations'),'recovery must unregister old service workers');
assert.ok(src.includes("key.startsWith('okello-food-v')"),'recovery must only target Okello Food caches');
assert.ok(src.includes('caches.delete(key)'),'recovery must delete stale app caches');
assert.ok(src.includes('location.replace(target)'),'recovery must redirect to a cache-busted app URL');
assert.ok(src.includes('Your diary and other localStorage data are not deleted'),'recovery must state local data preservation');
assert.equal(/localStorage\.(?:clear|removeItem)\s*\(/.test(src),false,'recovery must not clear or remove localStorage data');
assert.equal(/indexedDB\.deleteDatabase\s*\(/.test(src),false,'recovery must not delete IndexedDB data');

console.log('recovery-v47: PASS');
