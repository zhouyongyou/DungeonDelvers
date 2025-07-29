// 臨時修復：過濾可能導致問題的參數
export const filterProblematicParams = (params: any[]) => {
  // 如果你確定 explorationFee 是問題來源，可以過濾掉它
  // return params.filter(p => p.key !== 'explorationFee');
  
  // 或者過濾掉所有失敗的參數
  return params.filter(p => p.status !== 'failure');
};

// 添加錯誤邊界
export const safeReadContract = async (contract: any, functionName: string) => {
  try {
    const result = await contract[functionName]();
    return { success: true, data: result };
  } catch (error) {
    console.warn(`Failed to read ${functionName}:`, error);
    return { success: false, error };
  }
};