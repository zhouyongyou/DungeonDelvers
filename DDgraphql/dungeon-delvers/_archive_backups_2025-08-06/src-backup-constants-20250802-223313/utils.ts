// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/utils.ts
// 說明: 這個檔案用於存放可以在多個 mapping 檔案中重複使用的共用函式。
// =================================================================
import { BigInt } from "@graphprotocol/graph-ts"

/**
 * 根據總經驗值計算玩家等級。
 * @param exp 玩家的總經驗值。
 * @returns 計算出的等級 (i32)。
 */
export function calculateLevel(exp: BigInt): i32 {
  if (exp.lt(BigInt.fromI32(100))) { return 1 }
  // 使用整數開平方根來模擬 Solidity 中的 Math.sqrt
  const x = exp.div(BigInt.fromI32(100));
  let root = x;
  if (x.gt(BigInt.fromI32(0))) {
    let y = x.plus(BigInt.fromI32(1)).div(BigInt.fromI32(2));
    while (y.lt(root)) {
      root = y;
      y = x.div(y).plus(y).div(BigInt.fromI32(2));
    }
  }
  return root.toI32() + 1
}
