import { keccak256, toHex } from 'viem';

// Calculate error selectors for common errors
const errors = [
  'EnforcedPause()',
  'ExpectedPause()',
  'OwnableInvalidOwner(address)',
  'OwnableUnauthorizedAccount(address)',
  'ReentrancyGuardReentrantCall()',
  'SafeERC20FailedOperation(address)',
  'Paused()',
  'NotPaused()',
  'Unauthorized()',
  'InvalidAddress()',
  'InvalidAmount()',
  'InsufficientBalance(uint256,uint256)'
];

console.log('Error selectors:');
errors.forEach(error => {
  const hash = keccak256(toHex(error));
  const selector = hash.slice(0, 10);
  console.log(`${error}: ${selector}`);
});

// Check if our target selector matches
const targetSelector = '0x7e273289';
console.log(`\nLooking for: ${targetSelector}`);