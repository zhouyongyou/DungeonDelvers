// src/utils/contractValidator.ts

import { logger } from './logger';
import type { ContractConfig } from '../config/contractsWithABI';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that a contract configuration is complete and valid
 */
export function validateContract(
  name: string,
  contract: ContractConfig | null | undefined
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!contract) {
    errors.push(`Contract ${name} is not configured`);
    return { isValid: false, errors, warnings };
  }

  if (!contract.address) {
    errors.push(`Contract ${name} has no address`);
  } else if (contract.address === '0x0000000000000000000000000000000000000000') {
    errors.push(`Contract ${name} has zero address`);
  }

  if (!contract.abi || !Array.isArray(contract.abi)) {
    errors.push(`Contract ${name} has invalid ABI`);
  } else if (contract.abi.length === 0) {
    errors.push(`Contract ${name} has empty ABI`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Checks if a function exists in the contract ABI
 */
export function hasFunctionInABI(
  abi: any[],
  functionName: string
): boolean {
  if (!Array.isArray(abi)) return false;
  
  return abi.some(item => 
    item.type === 'function' && 
    item.name === functionName
  );
}

/**
 * Validates all required contracts for admin functionality
 */
export function validateAdminContracts(
  contracts: Record<string, ContractConfig | null | undefined>
): ValidationResult {
  const requiredContracts = [
    'dungeonCore',
    'hero',
    'relic',
    'party',
    'dungeonMaster',
    'playerVault',
    'vipStaking',
    'oracle',
    'playerProfile'
  ];

  // Optional contracts (may not be deployed yet)
  const optionalContracts = [
    'altarOfAscension'
  ];

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate required contracts
  for (const contractName of requiredContracts) {
    const validation = validateContract(contractName, contracts[contractName]);
    allErrors.push(...validation.errors);
    allWarnings.push(...validation.warnings);
  }

  // Validate optional contracts (only warn if not configured)
  for (const contractName of optionalContracts) {
    const validation = validateContract(contractName, contracts[contractName]);
    // Convert errors to warnings for optional contracts
    if (!validation.isValid) {
      allWarnings.push(`[Optional] ${contractName} is not configured or invalid`);
    }
    allWarnings.push(...validation.warnings);
  }

  // Validate specific functions exist
  const functionChecks = [
    { contract: 'dungeonMaster', function: 'explorationFee' },
    { contract: 'dungeonMaster', function: 'setExplorationFee' },
    { contract: 'hero', function: 'mintPriceUSD' },
    { contract: 'hero', function: 'setMintPriceUSD' },
    { contract: 'party', function: 'platformFee' },
    { contract: 'party', function: 'setPlatformFee' }
  ];

  for (const check of functionChecks) {
    const contract = contracts[check.contract];
    if (contract?.abi && !hasFunctionInABI(contract.abi, check.function)) {
      allWarnings.push(`Function ${check.function} not found in ${check.contract} ABI`);
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Gets a safe contract configuration with validation
 */
export function getSafeContract(
  contracts: Record<string, ContractConfig | null | undefined>,
  name: string
): ContractConfig | null {
  const contract = contracts[name];
  const validation = validateContract(name, contract);
  
  if (!validation.isValid) {
    logger.error(`Contract ${name} validation failed:`, validation.errors);
    return null;
  }
  
  return contract;
}

/**
 * Checks which contracts support specific functions
 */
export function getContractCapabilities(
  contracts: Record<string, ContractConfig | null | undefined>
): Record<string, {
  supportsPause: boolean;
  supportsWithdrawSoulShard: boolean;
  supportsWithdrawBNB: boolean;
  supportedWithdrawBNBFunctions: string[];
}> {
  const capabilities: Record<string, any> = {};
  
  for (const [name, contract] of Object.entries(contracts)) {
    if (!contract?.abi) {
      capabilities[name] = {
        supportsPause: false,
        supportsWithdrawSoulShard: false,
        supportsWithdrawBNB: false,
        supportedWithdrawBNBFunctions: []
      };
      continue;
    }
    
    const abi = contract.abi;
    const supportsPause = hasFunctionInABI(abi, 'pause') && hasFunctionInABI(abi, 'unpause');
    const supportsWithdrawSoulShard = hasFunctionInABI(abi, 'withdrawSoulShard');
    
    // Check various BNB withdrawal function names
    const bnbFunctions = ['withdrawBNB', 'withdraw', 'withdrawETH', 'withdrawFunds', 'withdrawNative'];
    const supportedWithdrawBNBFunctions = bnbFunctions.filter(func => hasFunctionInABI(abi, func));
    
    capabilities[name] = {
      supportsPause,
      supportsWithdrawSoulShard,
      supportsWithdrawBNB: supportedWithdrawBNBFunctions.length > 0,
      supportedWithdrawBNBFunctions
    };
  }
  
  return capabilities;
}