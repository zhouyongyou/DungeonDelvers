// 調試版本 - 用於檢查事件名稱問題
// 在 AltarPage.tsx 第 464-466 行附近添加以下調試代碼：

const decodedUpgradeLog = decodeEventLog({ abi: altarOfAscensionABI, ...upgradeLog });
console.log('解析的事件:', {
    eventName: decodedUpgradeLog.eventName,
    args: decodedUpgradeLog.args,
    fullLog: decodedUpgradeLog
});

// 臨時修復：更寬鬆的事件檢查
if (!decodedUpgradeLog.eventName || !decodedUpgradeLog.eventName.includes('Upgrade')) {
    console.error('事件名稱不符:', decodedUpgradeLog.eventName);
    throw new Error(`事件名稱不符: ${decodedUpgradeLog.eventName}`);
}