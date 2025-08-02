// 修復方案：替換 AltarPage.tsx 第 461-466 行

// 原始代碼：
// const upgradeLog = receipt.logs.find((log: any) => log.address.toLowerCase() === altarContract?.address.toLowerCase());
// if (!upgradeLog) throw new Error("找不到升級事件");
// const decodedUpgradeLog = decodeEventLog({ abi: altarOfAscensionABI, ...upgradeLog });
// if (decodedUpgradeLog.eventName !== 'UpgradeAttempted') throw new Error("事件名稱不符");

// 修復後的代碼：
import { debugAltarTransaction, findUpgradeAttemptedEvent } from '../utils/debugAltarEvent';

// 調試模式（可選）
if (process.env.NODE_ENV === 'development') {
    debugAltarTransaction(receipt, altarContract?.address || '');
}

// 查找 UpgradeAttempted 事件
const result = findUpgradeAttemptedEvent(receipt, altarContract?.address || '');
if (!result) {
    throw new Error("找不到 UpgradeAttempted 事件");
}

const { decoded: decodedUpgradeLog } = result;

// 繼續原有邏輯...
const outcome = Number(((decodedUpgradeLog.args as unknown) as Record<string, unknown>).outcome);