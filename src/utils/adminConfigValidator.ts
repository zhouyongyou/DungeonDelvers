// src/utils/adminConfigValidator.ts - 管理員配置驗證器

import { type Address } from 'viem';
import { getContract } from '../config/contracts';
import { logger } from './logger';

// 合約配置項接口
interface ContractConfigItem {
  key: string;
  label: string;
  contractName: string;
  getter: string;
  setter: string;
  unit?: 'USD' | 'BNB' | '‱' | '無';
  placeholders?: string[];
  required?: boolean;
  validation?: (value: any) => boolean;
}

// 驗證結果接口
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validConfigs: ContractConfigItem[];
  invalidConfigs: ContractConfigItem[];
}

// 管理員配置驗證器
export class AdminConfigValidator {
  private chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
  }

  // 驗證參數配置
  validateParameterConfig(configs: ContractConfigItem[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validConfigs: ContractConfigItem[] = [];
    const invalidConfigs: ContractConfigItem[] = [];

    configs.forEach((config, index) => {
      const configErrors = this.validateSingleConfig(config, index);
      
      if (configErrors.length > 0) {
        errors.push(...configErrors);
        invalidConfigs.push(config);
      } else {
        validConfigs.push(config);
      }
    });

    // 檢查重複的 key
    const keys = configs.map(c => c.key);
    const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
    if (duplicateKeys.length > 0) {
      errors.push(`發現重複的配置 key: ${duplicateKeys.join(', ')}`);
    }

    // 性能警告
    if (validConfigs.length > 15) {
      warnings.push(`配置項數量過多 (${validConfigs.length})，可能影響載入性能`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validConfigs,
      invalidConfigs,
    };
  }

  // 驗證單個配置項
  private validateSingleConfig(config: ContractConfigItem, index: number): string[] {
    const errors: string[] = [];

    // 檢查必需字段
    if (!config.key) {
      errors.push(`配置 ${index}: 缺少 key`);
    }

    if (!config.label) {
      errors.push(`配置 ${index}: 缺少 label`);
    }

    if (!config.contractName) {
      errors.push(`配置 ${index}: 缺少 contractName`);
    }

    if (!config.getter) {
      errors.push(`配置 ${index}: 缺少 getter 函數名`);
    }

    if (!config.setter) {
      errors.push(`配置 ${index}: 缺少 setter 函數名`);
    }

    // 驗證合約地址
    if (config.contractName) {
      const contract = getContract(this.chainId, config.contractName as any);
      if (!contract) {
        errors.push(`配置 ${index}: 無法找到合約 ${config.contractName}`);
      } else if (!this.isValidAddress(contract.address)) {
        errors.push(`配置 ${index}: 無效的合約地址 ${contract.address}`);
      }
    }

    // 驗證 placeholders
    if (config.placeholders && !Array.isArray(config.placeholders)) {
      errors.push(`配置 ${index}: placeholders 必須是陣列`);
    }

    return errors;
  }

  // 驗證合約地址
  private isValidAddress(address: string): boolean {
    return !!(address && 
      address.length === 42 && 
      address.startsWith('0x') && 
      address !== '0x0000000000000000000000000000000000000000'
    );
  }

  // 生成優化的參數配置
  generateOptimizedParameterConfig(chainId: number): ContractConfigItem[] {
    const configs: ContractConfigItem[] = [];

    // 檢查合約可用性
    const contracts = {
      hero: getContract(chainId, 'hero'),
      relic: getContract(chainId, 'relic'),
      party: getContract(chainId, 'party'),
      dungeonMaster: getContract(chainId, 'dungeonMaster'),
      playerVault: getContract(chainId, 'playerVault'),
      vipStaking: getContract(chainId, 'vipStaking'),
      oracle: getContract(chainId, 'oracle'),
    };

    // 只添加有效的合約配置
    if (contracts.hero?.address && this.isValidAddress(contracts.hero.address)) {
      configs.push({
        key: 'heroMintPrice',
        label: '英雄鑄造價',
        contractName: 'hero',
        getter: 'mintPriceUSD',
        setter: 'setMintPriceUSD',
        unit: 'USD',
        placeholders: ['新價格 (USD)'],
        required: true,
        validation: (value) => value > 0,
      });

      configs.push({
        key: 'heroFee',
        label: '英雄平台費',
        contractName: 'hero',
        getter: 'platformFee',
        setter: 'setPlatformFee',
        unit: 'BNB',
        placeholders: ['新費用 (BNB)'],
        required: true,
        validation: (value) => value >= 0,
      });
    }

    if (contracts.relic?.address && this.isValidAddress(contracts.relic.address)) {
      configs.push({
        key: 'relicMintPrice',
        label: '聖物鑄造價',
        contractName: 'relic',
        getter: 'mintPriceUSD',
        setter: 'setMintPriceUSD',
        unit: 'USD',
        placeholders: ['新價格 (USD)'],
        required: true,
        validation: (value) => value > 0,
      });

      configs.push({
        key: 'relicFee',
        label: '聖物平台費',
        contractName: 'relic',
        getter: 'platformFee',
        setter: 'setPlatformFee',
        unit: 'BNB',
        placeholders: ['新費用 (BNB)'],
        required: true,
        validation: (value) => value >= 0,
      });
    }

    if (contracts.party?.address && this.isValidAddress(contracts.party.address)) {
      configs.push({
        key: 'partyFee',
        label: '隊伍平台費',
        contractName: 'party',
        getter: 'platformFee',
        setter: 'setPlatformFee',
        unit: 'BNB',
        placeholders: ['新費用 (BNB)'],
        required: true,
        validation: (value) => value >= 0,
      });
    }

    if (contracts.dungeonMaster?.address && this.isValidAddress(contracts.dungeonMaster.address)) {
      configs.push({
        key: 'provisionPrice',
        label: '儲備購買價',
        contractName: 'dungeonMaster',
        getter: 'provisionPriceUSD',
        setter: 'setProvisionPriceUSD',
        unit: 'USD',
        placeholders: ['新價格 (USD)'],
        required: true,
        validation: (value) => value > 0,
      });

      configs.push({
        key: 'explorationFee',
        label: '遠征探索費',
        contractName: 'dungeonMaster',
        getter: 'explorationFee',
        setter: 'setExplorationFee',
        unit: 'BNB',
        placeholders: ['新費用 (BNB)'],
        required: true,
        validation: (value) => value >= 0,
      });

      configs.push({
        key: 'restDivisor',
        label: '休息成本係數',
        contractName: 'dungeonMaster',
        getter: 'restCostPowerDivisor',
        setter: 'setRestCostPowerDivisor',
        unit: '無',
        placeholders: ['新係數 (戰力/USD)'],
        required: true,
        validation: (value) => value > 0,
      });

      configs.push({
        key: 'globalRewardMultiplier',
        label: '全域獎勵倍率',
        contractName: 'dungeonMaster',
        getter: 'globalRewardMultiplier',
        setter: 'setGlobalRewardMultiplier',
        unit: '‱',
        placeholders: ['新倍率 (1000=100%)'],
        required: true,
        validation: (value) => value > 0,
      });
    }

    if (contracts.playerVault?.address && this.isValidAddress(contracts.playerVault.address)) {
      configs.push({
        key: 'commissionRate',
        label: '邀請佣金率',
        contractName: 'playerVault',
        getter: 'commissionRate',
        setter: 'setCommissionRate',
        unit: '‱',
        placeholders: ['新佣金率 (萬分位)'],
        required: true,
        validation: (value) => value >= 0 && value <= 10000,
      });
    }

    if (contracts.vipStaking?.address && this.isValidAddress(contracts.vipStaking.address)) {
      configs.push({
        key: 'vipCooldown',
        label: 'VIP 取消質押冷卻 (秒)',
        contractName: 'vipStaking',
        getter: 'unstakeCooldown',
        setter: 'setUnstakeCooldown',
        unit: '無',
        placeholders: ['新冷卻時間 (秒)'],
        required: true,
        validation: (value) => value >= 0,
      });
    }

    if (contracts.oracle?.address && this.isValidAddress(contracts.oracle.address)) {
      configs.push({
        key: 'twapPeriod',
        label: 'Oracle TWAP 週期',
        contractName: 'oracle',
        getter: 'twapPeriod',
        setter: 'setTwapPeriod',
        unit: '無',
        placeholders: ['新週期 (秒)'],
        required: true,
        validation: (value) => value > 0,
      });
    }

    return configs;
  }

  // 生成合約讀取配置
  generateContractReadConfigs(parameterConfig: ContractConfigItem[]) {
    const validConfigs = this.validateParameterConfig(parameterConfig).validConfigs;
    
    return validConfigs.map(config => {
      const contract = getContract(this.chainId, config.contractName as any);
      
      if (!contract) {
        logger.warn(`無法找到合約: ${config.contractName}`);
        return null;
      }

      return {
        ...contract,
        functionName: config.getter,
        args: [],
      };
    }).filter(Boolean);
  }

  // 驗證設定配置
  validateSetupConfig(setupConfig: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validConfigs: any[] = [];
    const invalidConfigs: any[] = [];

    setupConfig.forEach((config, index) => {
      const configErrors: string[] = [];

      // 檢查必需字段
      if (!config.key) configErrors.push(`設定 ${index}: 缺少 key`);
      if (!config.title) configErrors.push(`設定 ${index}: 缺少 title`);
      if (!config.targetContractName) configErrors.push(`設定 ${index}: 缺少 targetContractName`);
      if (!config.setterFunctionName) configErrors.push(`設定 ${index}: 缺少 setterFunctionName`);
      if (!config.valueToSetContractName) configErrors.push(`設定 ${index}: 缺少 valueToSetContractName`);
      if (!config.getterFunctionName) configErrors.push(`設定 ${index}: 缺少 getterFunctionName`);

      // 驗證合約存在
      if (config.targetContractName) {
        const contract = getContract(this.chainId, config.targetContractName);
        if (!contract) {
          configErrors.push(`設定 ${index}: 無法找到目標合約 ${config.targetContractName}`);
        }
      }

      if (config.valueToSetContractName) {
        const contract = getContract(this.chainId, config.valueToSetContractName);
        if (!contract) {
          configErrors.push(`設定 ${index}: 無法找到值合約 ${config.valueToSetContractName}`);
        }
      }

      if (configErrors.length > 0) {
        errors.push(...configErrors);
        invalidConfigs.push(config);
      } else {
        validConfigs.push(config);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validConfigs,
      invalidConfigs,
    };
  }

  // 生成診斷報告
  generateDiagnosticReport(parameterConfig: ContractConfigItem[], setupConfig: any[]): string {
    const parameterValidation = this.validateParameterConfig(parameterConfig);
    const setupValidation = this.validateSetupConfig(setupConfig);

    const report = [
      '=== 管理員配置診斷報告 ===',
      '',
      '參數配置檢查:',
      `  總配置數: ${parameterConfig.length}`,
      `  有效配置: ${parameterValidation.validConfigs.length}`,
      `  無效配置: ${parameterValidation.invalidConfigs.length}`,
      '',
      '設定配置檢查:',
      `  總設定數: ${setupConfig.length}`,
      `  有效設定: ${setupValidation.validConfigs.length}`,
      `  無效設定: ${setupValidation.invalidConfigs.length}`,
      '',
    ];

    // 添加錯誤詳情
    if (parameterValidation.errors.length > 0) {
      report.push('參數配置錯誤:');
      parameterValidation.errors.forEach(error => report.push(`  - ${error}`));
      report.push('');
    }

    if (setupValidation.errors.length > 0) {
      report.push('設定配置錯誤:');
      setupValidation.errors.forEach(error => report.push(`  - ${error}`));
      report.push('');
    }

    // 添加警告
    const allWarnings = [...parameterValidation.warnings, ...setupValidation.warnings];
    if (allWarnings.length > 0) {
      report.push('警告:');
      allWarnings.forEach(warning => report.push(`  - ${warning}`));
      report.push('');
    }

    // 添加建議
    report.push('建議:');
    if (parameterValidation.invalidConfigs.length > 0) {
      report.push('  - 修復或移除無效的參數配置');
    }
    if (setupValidation.invalidConfigs.length > 0) {
      report.push('  - 修復或移除無效的設定配置');
    }
    if (parameterValidation.validConfigs.length > 15) {
      report.push('  - 考慮分頁或分組顯示配置項');
    }
    if (allWarnings.length === 0 && parameterValidation.errors.length === 0 && setupValidation.errors.length === 0) {
      report.push('  - 所有配置看起來都很正常！');
    }

    return report.join('\n');
  }
}

// 工具函數：創建驗證器
export function createAdminConfigValidator(chainId: number): AdminConfigValidator {
  return new AdminConfigValidator(chainId);
}

// 工具函數：快速驗證參數配置
export function validateParameterConfig(chainId: number, configs: ContractConfigItem[]): ValidationResult {
  const validator = new AdminConfigValidator(chainId);
  return validator.validateParameterConfig(configs);
}

// 工具函數：生成安全的參數配置
export function generateSafeParameterConfig(chainId: number): ContractConfigItem[] {
  const validator = new AdminConfigValidator(chainId);
  const configs = validator.generateOptimizedParameterConfig(chainId);
  const validation = validator.validateParameterConfig(configs);
  
  if (!validation.isValid) {
    logger.error('生成的參數配置無效:', validation.errors);
  }
  
  return validation.validConfigs;
}

// 導出類型
export type { ContractConfigItem, ValidationResult };