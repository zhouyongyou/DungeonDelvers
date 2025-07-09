# 子图调试修复记录

## 问题总结

您的子图遇到了多个事件签名不匹配的错误。主要问题是在 `subgraph.yaml` 文件中定义的事件签名包含了参数名称，但实际的 ABI 中的事件签名没有参数名称。

## 修复的问题

### 1. 事件签名不匹配问题

**问题描述：**
- 错误信息显示事件签名不匹配，例如：
  ```
  Event with signature 'HeroMinted(indexed uint256 tokenId, indexed address owner, uint8 rarity, uint256 power)' not present in ABI 'Hero'.
  ```

**解决方案：**
- 修改 `subgraph.yaml` 文件中的所有事件签名，移除参数名称：
  ```yaml
  # 修改前
  - event: HeroMinted(indexed uint256 tokenId, indexed address owner, uint8 rarity, uint256 power)
  
  # 修改后
  - event: HeroMinted(indexed uint256,indexed address,uint8,uint256)
  ```

### 2. 数据类型错误问题

**问题描述：**
- 在 `src/dungeon-master.ts` 中，代码试图对 `i32` 类型使用 `BigInt` 方法：
  ```typescript
  party.provisionsRemaining = party.provisionsRemaining.minus(BigInt.fromI32(1))
  ```

**解决方案：**
- 修改为使用普通的整数运算：
  ```typescript
  party.provisionsRemaining = party.provisionsRemaining - 1
  party.provisionsRemaining = party.provisionsRemaining + event.params.amount.toI32()
  ```

### 3. 事件参数名称错误问题

**问题描述：**
- 在 `src/player-vault.ts` 中，代码使用了错误的参数名称：
  ```typescript
  event.params.user // 应该是 event.params.player
  event.params.fee  // 应该是 event.params.taxAmount
  event.params.recipient // 应该是 event.params.referrer
  ```

**解决方案：**
- 查看生成的类型定义文件，使用正确的参数名称：
  ```typescript
  // Deposited 事件
  event.params.player // 而不是 event.params.user
  
  // Withdrawn 事件
  event.params.player // 而不是 event.params.user
  event.params.taxAmount // 而不是 event.params.fee
  
  // CommissionPaid 事件
  event.params.referrer // 而不是 event.params.recipient
  ```

## 修复后的结果

✅ 子图配置文件验证通过  
✅ 所有事件签名匹配成功  
✅ 代码生成成功  
✅ 子图编译成功  
✅ 构建完成：`build/subgraph.yaml`

## 最佳实践建议

1. **事件签名定义：** 在 `subgraph.yaml` 中定义事件时，不要包含参数名称，只使用类型
2. **类型匹配：** 确保 schema 中的字段类型与代码中的使用方式一致
3. **参数验证：** 在编写事件处理器时，先检查生成的类型文件以确认正确的参数名称
4. **构建测试：** 在开发过程中定期运行 `graph build` 来及早发现问题

## 成功构建确认

```bash
$ graph build
Build completed: build/subgraph.yaml
```

子图现在已经可以正常部署和运行了！