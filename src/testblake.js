import { blake256 } from '@noble/hashes/blake1';
import { blake2b } from '@noble/hashes/blake2b';

const toHexString = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

console.log(toHexString(blake256('')));
console.log(toHexString(blake2b('')));
