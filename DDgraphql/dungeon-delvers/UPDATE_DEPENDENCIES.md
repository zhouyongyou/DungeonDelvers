# 依赖更新指南

## 当前状态
✅ **子图构建成功** - 所有功能正常运行
✅ **事件签名正确** - 与ABI完全匹配
✅ **代码质量良好** - 没有编译错误

## 可选更新

### 1. 更新 graph-ts (推荐)
```bash
npm install --save @graphprotocol/graph-ts@latest
```

### 2. 更新 graph-cli (可选)
```bash
npm install --save-dev @graphprotocol/graph-cli@latest
```

### 3. 更新 matchstick-as (可选)
```bash
npm install --save-dev matchstick-as@latest
```

## 更新后操作

1. **重新生成代码**
```bash
npm run codegen
```

2. **测试构建**
```bash
npm run build
```

3. **如果API版本需要更新**
```yaml
# 在 subgraph.yaml 中更新 apiVersion
mapping:
  apiVersion: 0.0.9  # 可能需要更新到最新版本
```

## 注意事项

- 当前版本运行稳定，更新是**可选的**
- 如果遇到问题，可以回滚到当前版本
- 建议在测试环境中先验证更新

## 风险评估

🟢 **低风险**: 您的代码已经过良好测试，更新应该很平滑
🟡 **中等收益**: 可能获得性能改进和新功能
🔵 **建议**: 如果当前功能满足需求，可以保持现状

## 当前版本信息
- graph-cli: 0.97.1
- graph-ts: 0.37.0  
- matchstick-as: 0.6.0

## 可用更新
- graph-ts: 0.38.1 ⬆️