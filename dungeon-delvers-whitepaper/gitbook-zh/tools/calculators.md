# 🧮 實用計算器工具

提供各種計算工具，幫助您做出更明智的遊戲決策！

## 🎯 戰力優化計算器

### 門檻計算器

<div style="background: #e3f2fd; padding: 20px; border-radius: 10px;">

**輸入您的隊伍信息**

```html
<!-- 這裡可以嵌入實際的計算器 -->
<div class="calculator-container">
  <h4>當前隊伍戰力：</h4>
  <input type="number" id="currentPower" placeholder="輸入總戰力" min="0">
  
  <h4>目標門檻：</h4>
  <select id="targetThreshold">
    <option value="300">300 (+10% 獎勵)</option>
    <option value="600">600 (+20% 獎勵)</option>
    <option value="900">900 (+30% 獎勵)</option>
    <option value="1200">1200 (+40% 獎勵)</option>
    <option value="1500">1500 (+50% 獎勵)</option>
  </select>
  
  <button onclick="calculateThreshold()">計算</button>
  
  <div id="result">
    <!-- 計算結果將顯示在這裡 -->
  </div>
</div>
```

**JavaScript 代碼**
```javascript
function calculateThreshold() {
  const current = parseInt(document.getElementById('currentPower').value);
  const target = parseInt(document.getElementById('targetThreshold').value);
  
  if (current >= target) {
    document.getElementById('result').innerHTML = `
      <div style="color: green;">
        ✅ 您已達到 ${target} 門檻！<br>
        當前獎勵加成：${Math.floor(current/300) * 10}%<br>
        建議：可考慮衝擊下一個門檻 ${target + 300}
      </div>
    `;
  } else {
    const needed = target - current;
    const heroes = Math.ceil(needed / 60); // 假設平均英雄戰力60
    const cost = heroes * 30; // 假設平均價格30 USDT
    
    document.getElementById('result').innerHTML = `
      <div style="color: orange;">
        📊 升級建議：<br>
        需要增加：${needed} 戰力<br>
        建議購買：${heroes} 個英雄<br>
        預估成本：${cost} USDT<br>
        獎勵提升：${Math.floor(target/300) * 10 - Math.floor(current/300) * 10}%
      </div>
    `;
  }
}
```

</div>

## ⭐ 升星收益計算器

### 期望值計算

<div style="background: #f3e5f5; padding: 20px; border-radius: 10px;">

**升星投資分析**

<table>
<tr>
<th>升級路徑</th>
<th>材料成本</th>
<th>成功率 (VIP0)</th>
<th>成功率 (VIP3)</th>
<th>期望收益</th>
<th>建議</th>
</tr>
<tr>
<td>1★→2★</td>
<td>50 USDT</td>
<td>45%</td>
<td>60%</td>
<td id="ev-1to2">計算中...</td>
<td id="rec-1to2">-</td>
</tr>
<tr>
<td>2★→3★</td>
<td>150 USDT</td>
<td>30%</td>
<td>45%</td>
<td id="ev-2to3">計算中...</td>
<td id="rec-2to3">-</td>
</tr>
<tr>
<td>3★→4★</td>
<td>400 USDT</td>
<td>20%</td>
<td>35%</td>
<td id="ev-3to4">計算中...</td>
<td id="rec-3to4">-</td>
</tr>
<tr>
<td>4★→5★</td>
<td>1000 USDT</td>
<td>10%</td>
<td>25%</td>
<td id="ev-4to5">計算中...</td>
<td id="rec-4to5">-</td>
</tr>
</table>

**計算公式**
```javascript
function calculateUpgradeEV(fromStar, toStar, materialCost, successRate) {
  const valueMultipliers = {
    2: 2.5,   // 2星價值是材料的2.5倍
    3: 3.0,   // 3星價值是材料的3倍
    4: 4.0,   // 4星價值是材料的4倍
    5: 5.0    // 5星價值是材料的5倍
  };
  
  const successValue = materialCost * valueMultipliers[toStar];
  const failureValue = 0; // 失敗材料全失
  
  const expectedValue = successRate * (successValue - materialCost) + 
                        (1 - successRate) * (-materialCost);
  
  return {
    expectedValue,
    roi: (expectedValue / materialCost) * 100,
    recommendation: expectedValue > 0 ? "建議升級" : "不建議"
  };
}
```

</div>

## 💰 收益預測計算器

### 日收益計算

<div style="background: #e8f5e9; padding: 20px; border-radius: 10px;">

**個人收益預測**

```javascript
class IncomeCalculator {
  constructor(partyPower, partyCount, vipLevel, dungeonLevel) {
    this.partyPower = partyPower;
    this.partyCount = partyCount;
    this.vipLevel = vipLevel;
    this.dungeonLevel = dungeonLevel;
  }
  
  calculateDailyIncome() {
    // 基礎獎勵
    const baseRewards = {
      1: 15,   // 新手地城
      2: 40,   // 冒險地城
      3: 85,   // 勇者地城
      4: 180,  // 英雄地城
      5: 350   // 史詩地城
    };
    
    const baseReward = baseRewards[this.dungeonLevel];
    
    // 戰力加成
    const powerBonus = Math.floor(this.partyPower / 300) * 0.1;
    
    // VIP 加成
    const vipBonus = this.vipLevel * 0.1;
    
    // 單次收益
    const singleReward = baseReward * (1 + powerBonus + vipBonus);
    
    // 日收益（假設每隊12次）
    const dailyIncome = singleReward * 12 * this.partyCount;
    
    return {
      singleReward: Math.round(singleReward),
      dailyIncome: Math.round(dailyIncome),
      monthlyIncome: Math.round(dailyIncome * 30),
      yearlyIncome: Math.round(dailyIncome * 365)
    };
  }
  
  calculateROI(initialInvestment) {
    const monthly = this.calculateDailyIncome().monthlyIncome;
    const breakEvenMonths = initialInvestment / monthly;
    const yearlyROI = (monthly * 12 / initialInvestment) * 100;
    
    return {
      monthlyIncome: monthly,
      breakEvenMonths: Math.round(breakEvenMonths * 10) / 10,
      yearlyROI: Math.round(yearlyROI * 10) / 10
    };
  }
}

// 使用示例
const calculator = new IncomeCalculator(600, 2, 2, 3);
const income = calculator.calculateDailyIncome();
const roi = calculator.calculateROI(1000);

console.log(`日收益: ${income.dailyIncome} SOUL`);
console.log(`月收益: ${income.monthlyIncome} SOUL`);
console.log(`回本週期: ${roi.breakEvenMonths} 個月`);
```

</div>

## 📊 VIP 投資分析器

### VIP 等級對比

<div style="background: #fff3cd; padding: 20px; border-radius: 10px;">

**VIP 投資回報計算**

```javascript
function calculateVIPReturn(vipLevel, gameAssets, months) {
  const vipRequirements = {
    1: 10000,   // 質押要求
    2: 50000,
    3: 100000,
    4: 500000,
    5: 1000000
  };
  
  const stakedAmount = vipRequirements[vipLevel];
  
  // 質押收益 (年化12-21%)
  const stakingAPR = 0.12 + (vipLevel - 1) * 0.025;
  const monthlyStakingIncome = stakedAmount * stakingAPR / 12;
  
  // 遊戲收益加成
  const gameBonus = vipLevel * 0.1;
  const baseGameIncome = gameAssets * 50; // 假設每月基礎收益
  const boostedGameIncome = baseGameIncome * (1 + gameBonus);
  const gameIncomeIncrease = boostedGameIncome - baseGameIncome;
  
  // 總月收益
  const totalMonthlyIncome = monthlyStakingIncome + gameIncomeIncrease;
  
  // ROI 計算
  const totalIncome = totalMonthlyIncome * months;
  const roi = (totalIncome - stakedAmount) / stakedAmount * 100;
  
  return {
    stakedAmount,
    monthlyStakingIncome: Math.round(monthlyStakingIncome),
    gameIncomeIncrease: Math.round(gameIncomeIncrease),  
    totalMonthlyIncome: Math.round(totalMonthlyIncome),
    breakEvenMonths: Math.round(stakedAmount / totalMonthlyIncome * 10) / 10,
    roi: Math.round(roi * 10) / 10
  };
}

// VIP 等級對比
for (let vip = 1; vip <= 5; vip++) {
  const result = calculateVIPReturn(vip, 100, 12);
  console.log(`VIP ${vip}: 月收益 $${result.totalMonthlyIncome}, 回本 ${result.breakEvenMonths}月`);
}
```

</div>

## 🎲 概率計算工具

### 升星成功概率

<div style="background: #fce4ec; padding: 20px; border-radius: 10px;">

**批量升星成功率預測**

```javascript
class ProbabilityCalculator {
  // 至少成功一次的概率
  static atLeastOneSuccess(attempts, successRate) {
    return 1 - Math.pow(1 - successRate, attempts);
  }
  
  // 恰好成功 k 次的概率
  static exactlyKSuccesses(attempts, k, successRate) {
    const combination = this.binomialCoefficient(attempts, k);
    return combination * 
           Math.pow(successRate, k) * 
           Math.pow(1 - successRate, attempts - k);
  }
  
  // 組合數 C(n,k)
  static binomialCoefficient(n, k) {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    
    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= (n - i) / (i + 1);
    }
    return Math.round(result);
  }
  
  // 期望成功次數
  static expectedSuccesses(attempts, successRate) {
    return attempts * successRate;
  }
}

// 使用示例：20次升星，35%成功率
const attempts = 20;
const successRate = 0.35;

console.log(`至少成功1次: ${(ProbabilityCalculator.atLeastOneSuccess(attempts, successRate) * 100).toFixed(1)}%`);
console.log(`恰好成功7次: ${(ProbabilityCalculator.exactlyKSuccesses(attempts, 7, successRate) * 100).toFixed(1)}%`);
console.log(`期望成功次數: ${ProbabilityCalculator.expectedSuccesses(attempts, successRate).toFixed(1)}次`);
```

</div>

## 💹 市場分析工具

### 價格趨勢分析

<div style="background: #e1f5fe; padding: 20px; border-radius: 10px;">

**技術指標計算**

```javascript
class MarketAnalyzer {
  // 移動平均線
  static movingAverage(prices, period) {
    const result = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }
  
  // RSI 指標
  static rsi(prices, period = 14) {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    
    const avgGain = gains.slice(-period).reduce((a, b) => a + b) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b) / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  // 波動率計算
  static volatility(prices) {
    const returns = prices.slice(1).map((price, i) => 
      Math.log(price / prices[i])
    );
    
    const avgReturn = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((sum, ret) => 
      sum + Math.pow(ret - avgReturn, 2), 0
    ) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }
}

// 示例價格數據
const prices = [100, 105, 103, 108, 112, 109, 115, 118, 114, 120];

console.log('5日移動平均:', MarketAnalyzer.movingAverage(prices, 5));
console.log('RSI:', MarketAnalyzer.rsi(prices).toFixed(2));
console.log('波動率:', (MarketAnalyzer.volatility(prices) * 100).toFixed(2) + '%');
```

</div>

## 🎯 投資組合優化器

### 風險分散計算

```javascript
class PortfolioOptimizer {
  constructor(assets) {
    this.assets = assets; // [{name, amount, risk, expectedReturn}]
  }
  
  // 計算投資組合風險
  calculatePortfolioRisk() {
    const totalValue = this.assets.reduce((sum, asset) => sum + asset.amount, 0);
    const weights = this.assets.map(asset => asset.amount / totalValue);
    
    // 簡化的風險計算（實際應考慮相關性）
    const portfolioRisk = weights.reduce((risk, weight, i) => 
      risk + Math.pow(weight, 2) * Math.pow(this.assets[i].risk, 2), 0
    );
    
    return Math.sqrt(portfolioRisk);
  }
  
  // 計算期望收益
  calculateExpectedReturn() {
    const totalValue = this.assets.reduce((sum, asset) => sum + asset.amount, 0);
    
    return this.assets.reduce((expectedReturn, asset) => 
      expectedReturn + (asset.amount / totalValue) * asset.expectedReturn, 0
    );
  }
  
  // 夏普比率
  calculateSharpeRatio(riskFreeRate = 0.02) {
    const expectedReturn = this.calculateExpectedReturn();
    const portfolioRisk = this.calculatePortfolioRisk();
    
    return (expectedReturn - riskFreeRate) / portfolioRisk;
  }
}

// 使用示例
const portfolio = new PortfolioOptimizer([
  {name: '1星英雄', amount: 1000, risk: 0.2, expectedReturn: 0.15},
  {name: '3星英雄', amount: 2000, risk: 0.4, expectedReturn: 0.25},
  {name: '5星英雄', amount: 3000, risk: 0.6, expectedReturn: 0.35},
  {name: 'VIP質押', amount: 10000, risk: 0.1, expectedReturn: 0.18}
]);

console.log('投資組合風險:', (portfolio.calculatePortfolioRisk() * 100).toFixed(2) + '%');
console.log('期望收益:', (portfolio.calculateExpectedReturn() * 100).toFixed(2) + '%');
console.log('夏普比率:', portfolio.calculateSharpeRatio().toFixed(3));
```

---

<div align="center" style="background: #f8f9fa; padding: 20px; border-radius: 10px;">

### 🧮 使用建議

**計算器使用技巧**：
1. **定期更新參數**：市場數據變化快，及時更新
2. **多方驗證**：對比多個工具的計算結果
3. **情景分析**：考慮最好、最壞、最可能的情況
4. **記錄追踪**：保存計算結果，追踪預測準確性

**⚠️ 免責聲明**：
- 所有計算基於歷史數據和假設條件
- 實際結果可能因市場變化而不同
- 投資有風險，決策需謹慎
- 建議結合多種分析方法

[下載 Excel 模板](../assets/calculators.xlsx) | [在線計算器](https://tools.soulboundsaga.com) | [技術支援](https://t.me/SoulboundSaga_Tech)

</div>