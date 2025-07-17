// src/components/admin/ContractHealthCheck.tsx

import React, { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { getContract } from '../../config/contracts';
import { validateAdminContracts } from '../../utils/contractValidator';
import { Icons } from '../ui/icons';
import { bsc } from 'wagmi/chains';

export const ContractHealthCheck: React.FC = () => {
  const { chainId } = useAccount();
  const currentChainId = chainId || bsc.id;

  const healthCheck = useMemo(() => {
    const contracts = {
      dungeonCore: getContract(currentChainId, 'dungeonCore'),
      hero: getContract(currentChainId, 'hero'),
      relic: getContract(currentChainId, 'relic'),
      party: getContract(currentChainId, 'party'),
      dungeonMaster: getContract(currentChainId, 'dungeonMaster'),
      playerVault: getContract(currentChainId, 'playerVault'),
      vipStaking: getContract(currentChainId, 'vipStaking'),
      oracle: getContract(currentChainId, 'oracle'),
      altarOfAscension: getContract(currentChainId, 'altarOfAscension'),
      playerProfile: getContract(currentChainId, 'playerProfile')
    };

    return validateAdminContracts(contracts);
  }, [currentChainId]);

  if (healthCheck.isValid && healthCheck.warnings.length === 0) {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <Icons.Check className="w-5 h-5 text-green-400" />
          <span className="text-green-300 font-medium">所有合約配置正常</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6 space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Icons.AlertTriangle className="w-5 h-5 text-yellow-400" />
        合約健康檢查
      </h3>

      {healthCheck.errors.length > 0 && (
        <div>
          <h4 className="text-red-400 font-medium mb-2">錯誤</h4>
          <ul className="space-y-1">
            {healthCheck.errors.map((error, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Icons.X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-300">{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {healthCheck.warnings.length > 0 && (
        <div>
          <h4 className="text-yellow-400 font-medium mb-2">警告</h4>
          <ul className="space-y-1">
            {healthCheck.warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Icons.AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span className="text-yellow-300">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-sm text-gray-400 mt-4">
        <p>請確保所有合約都已正確部署並配置在環境變數中。</p>
        <p>如果看到 ABI 相關的警告，可能需要更新合約 ABI 文件。</p>
      </div>
    </div>
  );
};