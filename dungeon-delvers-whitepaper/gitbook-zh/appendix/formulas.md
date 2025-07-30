# 🧮 數值公式集

掌握這些公式，成為 Soulbound Saga 的數據大師！

## ⚔️ 戰力計算公式

### 隊伍總戰力

<div style="background: #e3f2fd; padding: 20px; border-radius: 10px;">

**基礎公式**
```javascript
隊伍總戰力 = Σ(英雄戰力) × (1 + 聖物加成)

聖物加成 = 聖物數量 × 0.05  // 每個聖物 +5%
```

**實例計算**
```
英雄戰力：[80, 60, 50, 40, 30] = 260
聖物數量：3 個
聖物加成：3 × 0.05 = 0.15 (15%)
隊伍總戰力：260 × (1 + 0.15) = 299
```

</div>

### 戰力門檻加成

```javascript
function calculatePowerBonus(totalPower) {
  const threshold = Math.floor(totalPower / 300);
  return threshold * 0.1; // 每個門檻 +10%
}

// 例：898 戰力 → floor(898/300) = 2 → 20% 加成
// 例：900 戰力 → floor(900/300) = 3 → 30% 加成
```

## 🏰 地城探索公式

### 成功率計算

<div style="background: #e8f5e9; padding: 20px; border-radius: 10px;">

**核心公式**
```javascript
function calculateSuccessRate(partyPower, dungeonRequirement) {
  if (partyPower < dungeonRequirement) return 0;
  
  const ratio = partyPower / dungeonRequirement;
  
  // 基礎成功率曲線
  if (ratio >= 2.0) return 0.95; // 最高 95%
  if (ratio >= 1.5) return 0.85;
  if (ratio >= 1.2) return 0.75;
  if (ratio >= 1.0) return 0.60;
  
  return 0; // 戰力不足
}
```

**VIP 成功率修正**
```javascript
function applyVIPBonus(baseRate, vipLevel) {
  const vipBonus = vipLevel * 0.05; // 每級 +5%
  return Math.min(baseRate + vipBonus, 0.98); // 最高 98%
}
```

</div>

### 獎勵計算

```javascript
function calculateReward(dungeon, partyPower, vipLevel, isActivity = false) {
  // 基礎獎勵
  const baseReward = dungeon.baseReward;
  
  // 戰力加成
  const powerBonus = Math.floor(partyPower / 300) * 0.1;
  
  // VIP 加成
  const vipBonus = vipLevel * 0.1;
  
  // 活動加成
  const activityBonus = isActivity ? 0.5 : 0;
  
  // 隨機因子 (0.8 - 1.2)
  const randomFactor = 0.8 + Math.random() * 0.4;
  
  const finalReward = baseReward * 
                      (1 + powerBonus + vipBonus + activityBonus) * 
                      randomFactor;
  
  return Math.floor(finalReward);
}
```

## ⭐ 升星系統公式

### 基礎成功率

<div style="background: #f3e5f5; padding: 20px; border-radius: 10px;">

**成功率表**
```javascript
const BASE_SUCCESS_RATES = {
  "1to2": 0.45,  // 1星 → 2星
  "2to3": 0.30,  // 2星 → 3星  
  "3to4": 0.20,  // 3星 → 4星
  "4to5": 0.10   // 4星 → 5星
};

function getUpgradeSuccessRate(fromStar, toStar, vipLevel) {
  const key = fromStar + "to" + toStar;
  const baseRate = BASE_SUCCESS_RATES[key];
  const vipBonus = vipLevel * 0.05;
  
  return Math.min(baseRate + vipBonus, 0.75); // 最高 75%
}
```

</div>

### 升星期望值

```javascript
function calculateUpgradeExpectedValue(fromStar, materials, vipLevel) {
  const successRate = getUpgradeSuccessRate(fromStar, fromStar + 1, vipLevel);
  const materialCost = materials.length;
  const valueMultiplier = getValueMultiplier(fromStar + 1);
  
  // 期望值 = 成功率 × (價值提升 - 成本) + 失敗率 × (-成本)
  const expectedValue = successRate * (valueMultiplier - materialCost) + 
                        (1 - successRate) * (-materialCost);
  
  return expectedValue;
}

function getValueMultiplier(targetStar) {
  const multipliers = {
    2: 2.5,  // 2星價值是1星的2.5倍
    3: 3.0,  // 3星價值是2星的3倍
    4: 4.0,  // 4星價值是3星的4倍
    5: 5.0   // 5星價值是4星的5倍
  };
  return multipliers[targetStar] || 1;
}
```

## 💰 經濟系統公式

### VIP 收益計算

<div style="background: #fff3cd; padding: 20px; border-radius: 10px;">

**質押收益**
```javascript
function calculateVIPStakingReward(stakedAmount, vipLevel, days) {
  const baseAPR = 0.12; // 12% 年化
  const vipMultiplier = 1 + (vipLevel - 1) * 0.25; // VIP1=1x, VIP2=1.25x...
  
  const effectiveAPR = baseAPR * vipMultiplier;
  const dailyRate = effectiveAPR / 365;
  
  return stakedAmount * dailyRate * days;
}
```

**遊戲收益加成**
```javascript
function calculateVIPGameBonus(baseIncome, vipLevel) {
  const gameBonus = vipLevel * 0.1; // 每級 +10%
  return baseIncome * (1 + gameBonus);
}
```

</div>

### ROI 計算

```javascript
function calculateROI(initialInvestment, monthlyIncome, months) {
  const totalIncome = monthlyIncome * months;
  const roi = (totalIncome - initialInvestment) / initialInvestment;
  return {
    totalIncome,
    profit: totalIncome - initialInvestment,
    roi: roi * 100, // 百分比
    breakEvenMonths: initialInvestment / monthlyIncome
  };
}
```

### 推薦傭金

```javascript
function calculateReferralCommission(refereeSpending, tier = 1) {
  const COMMISSION_RATES = {
    1: 0.05,  // 一級推薦 5%
    2: 0.02,  // 二級推薦 2%（活動期間）
    3: 0.01   // 三級推薦 1%（特殊活動）
  };
  
  return refereeSpending * COMMISSION_RATES[tier];
}
```

## 📊 統計分析公式

### 成功率統計

<div style="background: #e8f5e9; padding: 20px; border-radius: 10px;">

**二項分佈期望**
```javascript
function calculateExpectedOutcome(trials, successRate) {
  return {
    expectedSuccesses: trials * successRate,
    expectedFailures: trials * (1 - successRate),
    variance: trials * successRate * (1 - successRate),
    standardDeviation: Math.sqrt(trials * successRate * (1 - successRate))
  };
}
```

**置信區間**
```javascript
function calculateConfidenceInterval(successes, trials, confidence = 0.95) {
  const p = successes / trials;
  const z = confidence === 0.95 ? 1.96 : 2.58; // 95% or 99%
  const margin = z * Math.sqrt(p * (1 - p) / trials);
  
  return {
    lower: Math.max(0, p - margin),
    upper: Math.min(1, p + margin),
    estimate: p
  };
}
```

</div>

### 市場分析

```javascript
function calculateMovingAverage(prices, window) {
  const result = [];
  for (let i = window - 1; i < prices.length; i++) {
    const sum = prices.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / window);
  }
  return result;
}

function calculateVolatility(prices) {
  const returns = prices.slice(1).map((price, i) => 
    Math.log(price / prices[i])
  );
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => 
    sum + Math.pow(ret - avgReturn, 2), 0
  ) / (returns.length - 1);
  
  return Math.sqrt(variance * 252); // 年化波動率
}
```

## 🎮 遊戲優化公式

### 最優隊伍配置

<div style="background: #fce4ec; padding: 20px; border-radius: 10px;">

**戰力效率最大化**
```javascript
function optimizePartyPower(heroes, targetThreshold) {
  // 貪心算法：優先選擇戰力最高的英雄
  heroes.sort((a, b) => b.power - a.power);
  
  let selectedHeroes = [];
  let currentPower = 0;
  
  for (const hero of heroes) {
    if (currentPower + hero.power <= targetThreshold + 50) {
      selectedHeroes.push(hero);
      currentPower += hero.power;
      
      if (currentPower >= targetThreshold) {
        break;
      }
    }
  }
  
  return {
    heroes: selectedHeroes,
    totalPower: currentPower,
    efficiency: currentPower / selectedHeroes.length
  };
}
```

</div>

### 冷卻時間優化

```javascript
function calculateOptimalCooldownStrategy(parties, soulPrice, hourlyValue) {
  return parties.map(party => {
    const resetCost = party.remainingCooldown * 0.5; // SOUL per minute
    const resetCostUSD = resetCost * soulPrice;
    const timeValue = (party.remainingCooldown / 60) * hourlyValue;
    
    return {
      partyId: party.id,
      shouldReset: timeValue > resetCostUSD,
      costBenefit: timeValue - resetCostUSD,
      recommendation: timeValue > resetCostUSD ? 'RESET' : 'WAIT'
    };
  });
}
```

## 🔢 高級數學公式

### 複利計算

```javascript
function calculateCompoundInterest(principal, rate, compound, time) {
  // 複利公式：A = P(1 + r/n)^(nt)
  return principal * Math.pow(1 + rate / compound, compound * time);
}

function calculateContinuousCompound(principal, rate, time) {
  // 連續複利：A = Pe^(rt)
  return principal * Math.exp(rate * time);
}
```

### 風險評估

<div style="background: #ffecf0; padding: 20px; border-radius: 10px;">

**夏普比率**
```javascript
function calculateSharpeRatio(returns, riskFreeRate = 0.02) {
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => 
    sum + Math.pow(ret - avgReturn, 2), 0
  ) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  
  return (avgReturn - riskFreeRate) / stdDev;
}
```

**最大回撤**
```javascript
function calculateMaxDrawdown(equity) {
  let maxDrawdown = 0;
  let peak = equity[0];
  
  for (let i = 1; i < equity.length; i++) {
    if (equity[i] > peak) {
      peak = equity[i];
    } else {
      const drawdown = (peak - equity[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }
  
  return maxDrawdown;
}
```

</div>

## 🛠️ 實用工具函數

### 機率計算器

```javascript
class ProbabilityCalculator {
  // 至少成功一次的概率
  static atLeastOneSuccess(attempts, successRate) {
    return 1 - Math.pow(1 - successRate, attempts);
  }
  
  // 恰好成功 k 次的概率（二項分佈）
  static exactlyKSuccesses(attempts, k, successRate) {
    const combination = this.combination(attempts, k);
    return combination * 
           Math.pow(successRate, k) * 
           Math.pow(1 - successRate, attempts - k);
  }
  
  // 組合數 C(n,k)
  static combination(n, k) {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    
    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= (n - i) / (i + 1);
    }
    return Math.round(result);
  }
}
```

### 投資計算器

```javascript
class InvestmentCalculator {
  static dollarCostAveraging(monthlyInvestment, months, priceHistory) {
    let totalShares = 0;
    let totalInvested = 0;
    
    for (let i = 0; i < months && i < priceHistory.length; i++) {
      const shares = monthlyInvestment / priceHistory[i];
      totalShares += shares;
      totalInvested += monthlyInvestment;
    }
    
    const avgCost = totalInvested / totalShares;
    const currentValue = totalShares * priceHistory[priceHistory.length - 1];
    
    return {
      totalShares,
      totalInvested,
      averageCost: avgCost,
      currentValue,
      profit: currentValue - totalInvested,
      roi: (currentValue - totalInvested) / totalInvested
    };
  }
}
```

---

<div align="center" style="background: #f8f9fa; padding: 20px; border-radius: 10px;">

### 🧮 公式應用建議

**學習順序建議**：
1. 先掌握基礎公式（戰力、獎勵）
2. 理解概率統計（升星、探索）
3. 學習經濟計算（ROI、複利）
4. 進階數據分析（風險、優化）

**實用工具**：
- Excel/Google Sheets 建立個人計算表
- JavaScript 控制台快速計算
- Python/R 進行數據分析
- 加入社群分享計算心得

**💡 記住**：公式是工具，理解原理更重要！

[查看實時數據](../data/realtime-dashboard.md) | [使用計算器](../tools/calculators.md) | [討論區](https://t.me/Soulbound_Saga)

</div>