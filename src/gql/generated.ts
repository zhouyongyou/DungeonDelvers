export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigDecimal: { input: string; output: string; }
  BigInt: { input: string; output: string; }
  Bytes: { input: string; output: string; }
  Int8: { input: number; output: number; }
  Timestamp: { input: number; output: number; }
};

export type AdminAction = {
  __typename?: 'AdminAction';
  /**  操作類型 (setParameter, setContract, etc.)  */
  actionType: Scalars['String']['output'];
  /**  執行者地址  */
  executor: Scalars['Bytes']['output'];
  /**  函數名稱  */
  functionName: Scalars['String']['output'];
  /**  使用 `txHash-logIndex` 作為唯一 ID  */
  id: Scalars['String']['output'];
  /**  新值 (字符串格式)  */
  newValue: Scalars['String']['output'];
  /**  舊值 (字符串格式)  */
  oldValue?: Maybe<Scalars['String']['output']>;
  /**  參數名稱  */
  parameterName: Scalars['String']['output'];
  /**  目標合約  */
  targetContract: Scalars['Bytes']['output'];
  /**  時間戳  */
  timestamp: Scalars['BigInt']['output'];
  /**  交易哈希  */
  transactionHash: Scalars['Bytes']['output'];
};

export type AdminAction_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  actionType?: InputMaybe<Scalars['String']['input']>;
  actionType_contains?: InputMaybe<Scalars['String']['input']>;
  actionType_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  actionType_ends_with?: InputMaybe<Scalars['String']['input']>;
  actionType_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  actionType_gt?: InputMaybe<Scalars['String']['input']>;
  actionType_gte?: InputMaybe<Scalars['String']['input']>;
  actionType_in?: InputMaybe<Array<Scalars['String']['input']>>;
  actionType_lt?: InputMaybe<Scalars['String']['input']>;
  actionType_lte?: InputMaybe<Scalars['String']['input']>;
  actionType_not?: InputMaybe<Scalars['String']['input']>;
  actionType_not_contains?: InputMaybe<Scalars['String']['input']>;
  actionType_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  actionType_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  actionType_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  actionType_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  actionType_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  actionType_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  actionType_starts_with?: InputMaybe<Scalars['String']['input']>;
  actionType_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  and?: InputMaybe<Array<InputMaybe<AdminAction_Filter>>>;
  executor?: InputMaybe<Scalars['Bytes']['input']>;
  executor_contains?: InputMaybe<Scalars['Bytes']['input']>;
  executor_gt?: InputMaybe<Scalars['Bytes']['input']>;
  executor_gte?: InputMaybe<Scalars['Bytes']['input']>;
  executor_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  executor_lt?: InputMaybe<Scalars['Bytes']['input']>;
  executor_lte?: InputMaybe<Scalars['Bytes']['input']>;
  executor_not?: InputMaybe<Scalars['Bytes']['input']>;
  executor_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  executor_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  functionName?: InputMaybe<Scalars['String']['input']>;
  functionName_contains?: InputMaybe<Scalars['String']['input']>;
  functionName_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  functionName_ends_with?: InputMaybe<Scalars['String']['input']>;
  functionName_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  functionName_gt?: InputMaybe<Scalars['String']['input']>;
  functionName_gte?: InputMaybe<Scalars['String']['input']>;
  functionName_in?: InputMaybe<Array<Scalars['String']['input']>>;
  functionName_lt?: InputMaybe<Scalars['String']['input']>;
  functionName_lte?: InputMaybe<Scalars['String']['input']>;
  functionName_not?: InputMaybe<Scalars['String']['input']>;
  functionName_not_contains?: InputMaybe<Scalars['String']['input']>;
  functionName_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  functionName_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  functionName_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  functionName_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  functionName_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  functionName_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  functionName_starts_with?: InputMaybe<Scalars['String']['input']>;
  functionName_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  newValue?: InputMaybe<Scalars['String']['input']>;
  newValue_contains?: InputMaybe<Scalars['String']['input']>;
  newValue_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  newValue_ends_with?: InputMaybe<Scalars['String']['input']>;
  newValue_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  newValue_gt?: InputMaybe<Scalars['String']['input']>;
  newValue_gte?: InputMaybe<Scalars['String']['input']>;
  newValue_in?: InputMaybe<Array<Scalars['String']['input']>>;
  newValue_lt?: InputMaybe<Scalars['String']['input']>;
  newValue_lte?: InputMaybe<Scalars['String']['input']>;
  newValue_not?: InputMaybe<Scalars['String']['input']>;
  newValue_not_contains?: InputMaybe<Scalars['String']['input']>;
  newValue_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  newValue_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  newValue_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  newValue_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  newValue_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  newValue_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  newValue_starts_with?: InputMaybe<Scalars['String']['input']>;
  newValue_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  oldValue?: InputMaybe<Scalars['String']['input']>;
  oldValue_contains?: InputMaybe<Scalars['String']['input']>;
  oldValue_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  oldValue_ends_with?: InputMaybe<Scalars['String']['input']>;
  oldValue_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  oldValue_gt?: InputMaybe<Scalars['String']['input']>;
  oldValue_gte?: InputMaybe<Scalars['String']['input']>;
  oldValue_in?: InputMaybe<Array<Scalars['String']['input']>>;
  oldValue_lt?: InputMaybe<Scalars['String']['input']>;
  oldValue_lte?: InputMaybe<Scalars['String']['input']>;
  oldValue_not?: InputMaybe<Scalars['String']['input']>;
  oldValue_not_contains?: InputMaybe<Scalars['String']['input']>;
  oldValue_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  oldValue_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  oldValue_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  oldValue_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  oldValue_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  oldValue_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  oldValue_starts_with?: InputMaybe<Scalars['String']['input']>;
  oldValue_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<InputMaybe<AdminAction_Filter>>>;
  parameterName?: InputMaybe<Scalars['String']['input']>;
  parameterName_contains?: InputMaybe<Scalars['String']['input']>;
  parameterName_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  parameterName_ends_with?: InputMaybe<Scalars['String']['input']>;
  parameterName_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  parameterName_gt?: InputMaybe<Scalars['String']['input']>;
  parameterName_gte?: InputMaybe<Scalars['String']['input']>;
  parameterName_in?: InputMaybe<Array<Scalars['String']['input']>>;
  parameterName_lt?: InputMaybe<Scalars['String']['input']>;
  parameterName_lte?: InputMaybe<Scalars['String']['input']>;
  parameterName_not?: InputMaybe<Scalars['String']['input']>;
  parameterName_not_contains?: InputMaybe<Scalars['String']['input']>;
  parameterName_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  parameterName_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  parameterName_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  parameterName_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  parameterName_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  parameterName_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  parameterName_starts_with?: InputMaybe<Scalars['String']['input']>;
  parameterName_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  targetContract?: InputMaybe<Scalars['Bytes']['input']>;
  targetContract_contains?: InputMaybe<Scalars['Bytes']['input']>;
  targetContract_gt?: InputMaybe<Scalars['Bytes']['input']>;
  targetContract_gte?: InputMaybe<Scalars['Bytes']['input']>;
  targetContract_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  targetContract_lt?: InputMaybe<Scalars['Bytes']['input']>;
  targetContract_lte?: InputMaybe<Scalars['Bytes']['input']>;
  targetContract_not?: InputMaybe<Scalars['Bytes']['input']>;
  targetContract_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  targetContract_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  timestamp?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  transactionHash?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_contains?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  transactionHash_lt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_lte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
};

export type AdminAction_OrderBy =
  | 'actionType'
  | 'executor'
  | 'functionName'
  | 'id'
  | 'newValue'
  | 'oldValue'
  | 'parameterName'
  | 'targetContract'
  | 'timestamp'
  | 'transactionHash';

export type AdminParameters = {
  __typename?: 'AdminParameters';
  /**  邀請佣金率 (萬分位)  */
  commissionRate: Scalars['BigInt']['output'];
  /**  遠征探索費 (BNB)  */
  explorationFee: Scalars['BigInt']['output'];
  /**  全域獎勵倍率 (萬分位)  */
  globalRewardMultiplier: Scalars['BigInt']['output'];
  /**  英雄鑄造價格 (USD)  */
  heroMintPriceUSD: Scalars['BigInt']['output'];
  /**  英雄平台費 (BNB)  */
  heroPlatformFee: Scalars['BigInt']['output'];
  /**  固定 ID = 'admin'  */
  id: Scalars['String']['output'];
  /**  最後更新時間戳  */
  lastUpdatedAt: Scalars['BigInt']['output'];
  /**  隊伍平台費 (BNB)  */
  partyPlatformFee: Scalars['BigInt']['output'];
  /**  儲備購買價格 (USD)  */
  provisionPriceUSD: Scalars['BigInt']['output'];
  /**  聖物鑄造價格 (USD)  */
  relicMintPriceUSD: Scalars['BigInt']['output'];
  /**  聖物平台費 (BNB)  */
  relicPlatformFee: Scalars['BigInt']['output'];
  /**  休息成本係數  */
  restCostPowerDivisor: Scalars['BigInt']['output'];
  /**  TWAP 週期 (秒)  */
  twapPeriod: Scalars['BigInt']['output'];
  /**  更新者地址  */
  updatedBy: Scalars['Bytes']['output'];
  /**  VIP 取消質押冷卻時間 (秒)  */
  vipUnstakeCooldown: Scalars['BigInt']['output'];
};

export type AdminParameters_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<AdminParameters_Filter>>>;
  commissionRate?: InputMaybe<Scalars['BigInt']['input']>;
  commissionRate_gt?: InputMaybe<Scalars['BigInt']['input']>;
  commissionRate_gte?: InputMaybe<Scalars['BigInt']['input']>;
  commissionRate_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  commissionRate_lt?: InputMaybe<Scalars['BigInt']['input']>;
  commissionRate_lte?: InputMaybe<Scalars['BigInt']['input']>;
  commissionRate_not?: InputMaybe<Scalars['BigInt']['input']>;
  commissionRate_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  explorationFee?: InputMaybe<Scalars['BigInt']['input']>;
  explorationFee_gt?: InputMaybe<Scalars['BigInt']['input']>;
  explorationFee_gte?: InputMaybe<Scalars['BigInt']['input']>;
  explorationFee_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  explorationFee_lt?: InputMaybe<Scalars['BigInt']['input']>;
  explorationFee_lte?: InputMaybe<Scalars['BigInt']['input']>;
  explorationFee_not?: InputMaybe<Scalars['BigInt']['input']>;
  explorationFee_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  globalRewardMultiplier?: InputMaybe<Scalars['BigInt']['input']>;
  globalRewardMultiplier_gt?: InputMaybe<Scalars['BigInt']['input']>;
  globalRewardMultiplier_gte?: InputMaybe<Scalars['BigInt']['input']>;
  globalRewardMultiplier_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  globalRewardMultiplier_lt?: InputMaybe<Scalars['BigInt']['input']>;
  globalRewardMultiplier_lte?: InputMaybe<Scalars['BigInt']['input']>;
  globalRewardMultiplier_not?: InputMaybe<Scalars['BigInt']['input']>;
  globalRewardMultiplier_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  heroMintPriceUSD?: InputMaybe<Scalars['BigInt']['input']>;
  heroMintPriceUSD_gt?: InputMaybe<Scalars['BigInt']['input']>;
  heroMintPriceUSD_gte?: InputMaybe<Scalars['BigInt']['input']>;
  heroMintPriceUSD_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  heroMintPriceUSD_lt?: InputMaybe<Scalars['BigInt']['input']>;
  heroMintPriceUSD_lte?: InputMaybe<Scalars['BigInt']['input']>;
  heroMintPriceUSD_not?: InputMaybe<Scalars['BigInt']['input']>;
  heroMintPriceUSD_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  heroPlatformFee?: InputMaybe<Scalars['BigInt']['input']>;
  heroPlatformFee_gt?: InputMaybe<Scalars['BigInt']['input']>;
  heroPlatformFee_gte?: InputMaybe<Scalars['BigInt']['input']>;
  heroPlatformFee_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  heroPlatformFee_lt?: InputMaybe<Scalars['BigInt']['input']>;
  heroPlatformFee_lte?: InputMaybe<Scalars['BigInt']['input']>;
  heroPlatformFee_not?: InputMaybe<Scalars['BigInt']['input']>;
  heroPlatformFee_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  lastUpdatedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdatedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<AdminParameters_Filter>>>;
  partyPlatformFee?: InputMaybe<Scalars['BigInt']['input']>;
  partyPlatformFee_gt?: InputMaybe<Scalars['BigInt']['input']>;
  partyPlatformFee_gte?: InputMaybe<Scalars['BigInt']['input']>;
  partyPlatformFee_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  partyPlatformFee_lt?: InputMaybe<Scalars['BigInt']['input']>;
  partyPlatformFee_lte?: InputMaybe<Scalars['BigInt']['input']>;
  partyPlatformFee_not?: InputMaybe<Scalars['BigInt']['input']>;
  partyPlatformFee_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  provisionPriceUSD?: InputMaybe<Scalars['BigInt']['input']>;
  provisionPriceUSD_gt?: InputMaybe<Scalars['BigInt']['input']>;
  provisionPriceUSD_gte?: InputMaybe<Scalars['BigInt']['input']>;
  provisionPriceUSD_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  provisionPriceUSD_lt?: InputMaybe<Scalars['BigInt']['input']>;
  provisionPriceUSD_lte?: InputMaybe<Scalars['BigInt']['input']>;
  provisionPriceUSD_not?: InputMaybe<Scalars['BigInt']['input']>;
  provisionPriceUSD_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  relicMintPriceUSD?: InputMaybe<Scalars['BigInt']['input']>;
  relicMintPriceUSD_gt?: InputMaybe<Scalars['BigInt']['input']>;
  relicMintPriceUSD_gte?: InputMaybe<Scalars['BigInt']['input']>;
  relicMintPriceUSD_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  relicMintPriceUSD_lt?: InputMaybe<Scalars['BigInt']['input']>;
  relicMintPriceUSD_lte?: InputMaybe<Scalars['BigInt']['input']>;
  relicMintPriceUSD_not?: InputMaybe<Scalars['BigInt']['input']>;
  relicMintPriceUSD_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  relicPlatformFee?: InputMaybe<Scalars['BigInt']['input']>;
  relicPlatformFee_gt?: InputMaybe<Scalars['BigInt']['input']>;
  relicPlatformFee_gte?: InputMaybe<Scalars['BigInt']['input']>;
  relicPlatformFee_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  relicPlatformFee_lt?: InputMaybe<Scalars['BigInt']['input']>;
  relicPlatformFee_lte?: InputMaybe<Scalars['BigInt']['input']>;
  relicPlatformFee_not?: InputMaybe<Scalars['BigInt']['input']>;
  relicPlatformFee_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  restCostPowerDivisor?: InputMaybe<Scalars['BigInt']['input']>;
  restCostPowerDivisor_gt?: InputMaybe<Scalars['BigInt']['input']>;
  restCostPowerDivisor_gte?: InputMaybe<Scalars['BigInt']['input']>;
  restCostPowerDivisor_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  restCostPowerDivisor_lt?: InputMaybe<Scalars['BigInt']['input']>;
  restCostPowerDivisor_lte?: InputMaybe<Scalars['BigInt']['input']>;
  restCostPowerDivisor_not?: InputMaybe<Scalars['BigInt']['input']>;
  restCostPowerDivisor_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  twapPeriod?: InputMaybe<Scalars['BigInt']['input']>;
  twapPeriod_gt?: InputMaybe<Scalars['BigInt']['input']>;
  twapPeriod_gte?: InputMaybe<Scalars['BigInt']['input']>;
  twapPeriod_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  twapPeriod_lt?: InputMaybe<Scalars['BigInt']['input']>;
  twapPeriod_lte?: InputMaybe<Scalars['BigInt']['input']>;
  twapPeriod_not?: InputMaybe<Scalars['BigInt']['input']>;
  twapPeriod_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  updatedBy?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_contains?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_gt?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_gte?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  updatedBy_lt?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_lte?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_not?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  vipUnstakeCooldown?: InputMaybe<Scalars['BigInt']['input']>;
  vipUnstakeCooldown_gt?: InputMaybe<Scalars['BigInt']['input']>;
  vipUnstakeCooldown_gte?: InputMaybe<Scalars['BigInt']['input']>;
  vipUnstakeCooldown_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  vipUnstakeCooldown_lt?: InputMaybe<Scalars['BigInt']['input']>;
  vipUnstakeCooldown_lte?: InputMaybe<Scalars['BigInt']['input']>;
  vipUnstakeCooldown_not?: InputMaybe<Scalars['BigInt']['input']>;
  vipUnstakeCooldown_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type AdminParameters_OrderBy =
  | 'commissionRate'
  | 'explorationFee'
  | 'globalRewardMultiplier'
  | 'heroMintPriceUSD'
  | 'heroPlatformFee'
  | 'id'
  | 'lastUpdatedAt'
  | 'partyPlatformFee'
  | 'provisionPriceUSD'
  | 'relicMintPriceUSD'
  | 'relicPlatformFee'
  | 'restCostPowerDivisor'
  | 'twapPeriod'
  | 'updatedBy'
  | 'vipUnstakeCooldown';

export type Aggregation_Interval =
  | 'day'
  | 'hour';

export type BlockChangedFilter = {
  number_gte: Scalars['Int']['input'];
};

export type Block_Height = {
  hash?: InputMaybe<Scalars['Bytes']['input']>;
  number?: InputMaybe<Scalars['Int']['input']>;
  number_gte?: InputMaybe<Scalars['Int']['input']>;
};

export type ContractRegistry = {
  __typename?: 'ContractRegistry';
  /**  AltarOfAscension 合約地址  */
  altarOfAscension: Scalars['Bytes']['output'];
  /**  DungeonCore 合約地址  */
  dungeonCore: Scalars['Bytes']['output'];
  /**  DungeonMaster 合約地址  */
  dungeonMaster: Scalars['Bytes']['output'];
  /**  Hero NFT 合約地址  */
  hero: Scalars['Bytes']['output'];
  /**  固定 ID = 'contracts'  */
  id: Scalars['String']['output'];
  /**  最後更新時間戳  */
  lastUpdatedAt: Scalars['BigInt']['output'];
  /**  Oracle 合約地址  */
  oracle: Scalars['Bytes']['output'];
  /**  Party NFT 合約地址  */
  party: Scalars['Bytes']['output'];
  /**  PlayerProfile 合約地址  */
  playerProfile: Scalars['Bytes']['output'];
  /**  PlayerVault 合約地址  */
  playerVault: Scalars['Bytes']['output'];
  /**  Relic NFT 合約地址  */
  relic: Scalars['Bytes']['output'];
  /**  更新者地址  */
  updatedBy: Scalars['Bytes']['output'];
  /**  VipStaking 合約地址  */
  vipStaking: Scalars['Bytes']['output'];
};

export type ContractRegistry_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  altarOfAscension?: InputMaybe<Scalars['Bytes']['input']>;
  altarOfAscension_contains?: InputMaybe<Scalars['Bytes']['input']>;
  altarOfAscension_gt?: InputMaybe<Scalars['Bytes']['input']>;
  altarOfAscension_gte?: InputMaybe<Scalars['Bytes']['input']>;
  altarOfAscension_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  altarOfAscension_lt?: InputMaybe<Scalars['Bytes']['input']>;
  altarOfAscension_lte?: InputMaybe<Scalars['Bytes']['input']>;
  altarOfAscension_not?: InputMaybe<Scalars['Bytes']['input']>;
  altarOfAscension_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  altarOfAscension_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  and?: InputMaybe<Array<InputMaybe<ContractRegistry_Filter>>>;
  dungeonCore?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonCore_contains?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonCore_gt?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonCore_gte?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonCore_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  dungeonCore_lt?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonCore_lte?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonCore_not?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonCore_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonCore_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  dungeonMaster?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonMaster_contains?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonMaster_gt?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonMaster_gte?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonMaster_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  dungeonMaster_lt?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonMaster_lte?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonMaster_not?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonMaster_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  dungeonMaster_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  hero?: InputMaybe<Scalars['Bytes']['input']>;
  hero_contains?: InputMaybe<Scalars['Bytes']['input']>;
  hero_gt?: InputMaybe<Scalars['Bytes']['input']>;
  hero_gte?: InputMaybe<Scalars['Bytes']['input']>;
  hero_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  hero_lt?: InputMaybe<Scalars['Bytes']['input']>;
  hero_lte?: InputMaybe<Scalars['Bytes']['input']>;
  hero_not?: InputMaybe<Scalars['Bytes']['input']>;
  hero_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  hero_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  lastUpdatedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdatedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<ContractRegistry_Filter>>>;
  oracle?: InputMaybe<Scalars['Bytes']['input']>;
  oracle_contains?: InputMaybe<Scalars['Bytes']['input']>;
  oracle_gt?: InputMaybe<Scalars['Bytes']['input']>;
  oracle_gte?: InputMaybe<Scalars['Bytes']['input']>;
  oracle_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  oracle_lt?: InputMaybe<Scalars['Bytes']['input']>;
  oracle_lte?: InputMaybe<Scalars['Bytes']['input']>;
  oracle_not?: InputMaybe<Scalars['Bytes']['input']>;
  oracle_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  oracle_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  party?: InputMaybe<Scalars['Bytes']['input']>;
  party_contains?: InputMaybe<Scalars['Bytes']['input']>;
  party_gt?: InputMaybe<Scalars['Bytes']['input']>;
  party_gte?: InputMaybe<Scalars['Bytes']['input']>;
  party_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  party_lt?: InputMaybe<Scalars['Bytes']['input']>;
  party_lte?: InputMaybe<Scalars['Bytes']['input']>;
  party_not?: InputMaybe<Scalars['Bytes']['input']>;
  party_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  party_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  playerProfile?: InputMaybe<Scalars['Bytes']['input']>;
  playerProfile_contains?: InputMaybe<Scalars['Bytes']['input']>;
  playerProfile_gt?: InputMaybe<Scalars['Bytes']['input']>;
  playerProfile_gte?: InputMaybe<Scalars['Bytes']['input']>;
  playerProfile_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  playerProfile_lt?: InputMaybe<Scalars['Bytes']['input']>;
  playerProfile_lte?: InputMaybe<Scalars['Bytes']['input']>;
  playerProfile_not?: InputMaybe<Scalars['Bytes']['input']>;
  playerProfile_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  playerProfile_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  playerVault?: InputMaybe<Scalars['Bytes']['input']>;
  playerVault_contains?: InputMaybe<Scalars['Bytes']['input']>;
  playerVault_gt?: InputMaybe<Scalars['Bytes']['input']>;
  playerVault_gte?: InputMaybe<Scalars['Bytes']['input']>;
  playerVault_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  playerVault_lt?: InputMaybe<Scalars['Bytes']['input']>;
  playerVault_lte?: InputMaybe<Scalars['Bytes']['input']>;
  playerVault_not?: InputMaybe<Scalars['Bytes']['input']>;
  playerVault_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  playerVault_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  relic?: InputMaybe<Scalars['Bytes']['input']>;
  relic_contains?: InputMaybe<Scalars['Bytes']['input']>;
  relic_gt?: InputMaybe<Scalars['Bytes']['input']>;
  relic_gte?: InputMaybe<Scalars['Bytes']['input']>;
  relic_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  relic_lt?: InputMaybe<Scalars['Bytes']['input']>;
  relic_lte?: InputMaybe<Scalars['Bytes']['input']>;
  relic_not?: InputMaybe<Scalars['Bytes']['input']>;
  relic_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  relic_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  updatedBy?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_contains?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_gt?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_gte?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  updatedBy_lt?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_lte?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_not?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  updatedBy_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  vipStaking?: InputMaybe<Scalars['Bytes']['input']>;
  vipStaking_contains?: InputMaybe<Scalars['Bytes']['input']>;
  vipStaking_gt?: InputMaybe<Scalars['Bytes']['input']>;
  vipStaking_gte?: InputMaybe<Scalars['Bytes']['input']>;
  vipStaking_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  vipStaking_lt?: InputMaybe<Scalars['Bytes']['input']>;
  vipStaking_lte?: InputMaybe<Scalars['Bytes']['input']>;
  vipStaking_not?: InputMaybe<Scalars['Bytes']['input']>;
  vipStaking_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  vipStaking_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
};

export type ContractRegistry_OrderBy =
  | 'altarOfAscension'
  | 'dungeonCore'
  | 'dungeonMaster'
  | 'hero'
  | 'id'
  | 'lastUpdatedAt'
  | 'oracle'
  | 'party'
  | 'playerProfile'
  | 'playerVault'
  | 'relic'
  | 'updatedBy'
  | 'vipStaking';

export type Expedition = {
  __typename?: 'Expedition';
  /**  目標地下城 ID  */
  dungeonId: Scalars['BigInt']['output'];
  /**  地下城名稱  */
  dungeonName: Scalars['String']['output'];
  /**  地下城戰力要求  */
  dungeonPowerRequired: Scalars['BigInt']['output'];
  /**  獲得的經驗值  */
  expGained: Scalars['BigInt']['output'];
  /**  使用 `txHash-logIndex` 作為唯一 ID  */
  id: Scalars['String']['output'];
  /**  參與的隊伍  */
  party: Party;
  /**  隊伍戰力  */
  partyPower: Scalars['BigInt']['output'];
  /**  執行遠征的玩家  */
  player: Player;
  /**  獲得的獎勵 (SoulShard)  */
  reward: Scalars['BigInt']['output'];
  /**  是否成功  */
  success: Scalars['Boolean']['output'];
  /**  時間戳  */
  timestamp: Scalars['BigInt']['output'];
  /**  交易哈希  */
  transactionHash: Scalars['Bytes']['output'];
};

export type Expedition_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Expedition_Filter>>>;
  dungeonId?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonId_gt?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonId_gte?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  dungeonId_lt?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonId_lte?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonId_not?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  dungeonName?: InputMaybe<Scalars['String']['input']>;
  dungeonName_contains?: InputMaybe<Scalars['String']['input']>;
  dungeonName_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  dungeonName_ends_with?: InputMaybe<Scalars['String']['input']>;
  dungeonName_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  dungeonName_gt?: InputMaybe<Scalars['String']['input']>;
  dungeonName_gte?: InputMaybe<Scalars['String']['input']>;
  dungeonName_in?: InputMaybe<Array<Scalars['String']['input']>>;
  dungeonName_lt?: InputMaybe<Scalars['String']['input']>;
  dungeonName_lte?: InputMaybe<Scalars['String']['input']>;
  dungeonName_not?: InputMaybe<Scalars['String']['input']>;
  dungeonName_not_contains?: InputMaybe<Scalars['String']['input']>;
  dungeonName_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  dungeonName_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  dungeonName_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  dungeonName_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  dungeonName_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  dungeonName_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  dungeonName_starts_with?: InputMaybe<Scalars['String']['input']>;
  dungeonName_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  dungeonPowerRequired?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonPowerRequired_gt?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonPowerRequired_gte?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonPowerRequired_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  dungeonPowerRequired_lt?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonPowerRequired_lte?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonPowerRequired_not?: InputMaybe<Scalars['BigInt']['input']>;
  dungeonPowerRequired_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  expGained?: InputMaybe<Scalars['BigInt']['input']>;
  expGained_gt?: InputMaybe<Scalars['BigInt']['input']>;
  expGained_gte?: InputMaybe<Scalars['BigInt']['input']>;
  expGained_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  expGained_lt?: InputMaybe<Scalars['BigInt']['input']>;
  expGained_lte?: InputMaybe<Scalars['BigInt']['input']>;
  expGained_not?: InputMaybe<Scalars['BigInt']['input']>;
  expGained_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<InputMaybe<Expedition_Filter>>>;
  party?: InputMaybe<Scalars['String']['input']>;
  partyPower?: InputMaybe<Scalars['BigInt']['input']>;
  partyPower_gt?: InputMaybe<Scalars['BigInt']['input']>;
  partyPower_gte?: InputMaybe<Scalars['BigInt']['input']>;
  partyPower_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  partyPower_lt?: InputMaybe<Scalars['BigInt']['input']>;
  partyPower_lte?: InputMaybe<Scalars['BigInt']['input']>;
  partyPower_not?: InputMaybe<Scalars['BigInt']['input']>;
  partyPower_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  party_?: InputMaybe<Party_Filter>;
  party_contains?: InputMaybe<Scalars['String']['input']>;
  party_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  party_ends_with?: InputMaybe<Scalars['String']['input']>;
  party_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  party_gt?: InputMaybe<Scalars['String']['input']>;
  party_gte?: InputMaybe<Scalars['String']['input']>;
  party_in?: InputMaybe<Array<Scalars['String']['input']>>;
  party_lt?: InputMaybe<Scalars['String']['input']>;
  party_lte?: InputMaybe<Scalars['String']['input']>;
  party_not?: InputMaybe<Scalars['String']['input']>;
  party_not_contains?: InputMaybe<Scalars['String']['input']>;
  party_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  party_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  party_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  party_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  party_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  party_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  party_starts_with?: InputMaybe<Scalars['String']['input']>;
  party_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player?: InputMaybe<Scalars['String']['input']>;
  player_?: InputMaybe<Player_Filter>;
  player_contains?: InputMaybe<Scalars['String']['input']>;
  player_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  player_ends_with?: InputMaybe<Scalars['String']['input']>;
  player_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player_gt?: InputMaybe<Scalars['String']['input']>;
  player_gte?: InputMaybe<Scalars['String']['input']>;
  player_in?: InputMaybe<Array<Scalars['String']['input']>>;
  player_lt?: InputMaybe<Scalars['String']['input']>;
  player_lte?: InputMaybe<Scalars['String']['input']>;
  player_not?: InputMaybe<Scalars['String']['input']>;
  player_not_contains?: InputMaybe<Scalars['String']['input']>;
  player_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  player_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  player_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  player_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  player_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player_starts_with?: InputMaybe<Scalars['String']['input']>;
  player_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  reward?: InputMaybe<Scalars['BigInt']['input']>;
  reward_gt?: InputMaybe<Scalars['BigInt']['input']>;
  reward_gte?: InputMaybe<Scalars['BigInt']['input']>;
  reward_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  reward_lt?: InputMaybe<Scalars['BigInt']['input']>;
  reward_lte?: InputMaybe<Scalars['BigInt']['input']>;
  reward_not?: InputMaybe<Scalars['BigInt']['input']>;
  reward_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  success?: InputMaybe<Scalars['Boolean']['input']>;
  success_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  success_not?: InputMaybe<Scalars['Boolean']['input']>;
  success_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  timestamp?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  transactionHash?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_contains?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_gte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  transactionHash_lt?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_lte?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  transactionHash_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
};

export type Expedition_OrderBy =
  | 'dungeonId'
  | 'dungeonName'
  | 'dungeonPowerRequired'
  | 'expGained'
  | 'id'
  | 'party'
  | 'partyPower'
  | 'party__burnedAt'
  | 'party__contractAddress'
  | 'party__cooldownEndsAt'
  | 'party__createdAt'
  | 'party__id'
  | 'party__isBurned'
  | 'party__lastUpdatedAt'
  | 'party__name'
  | 'party__partyRarity'
  | 'party__provisionsRemaining'
  | 'party__tokenId'
  | 'party__totalCapacity'
  | 'party__totalPower'
  | 'party__unclaimedRewards'
  | 'player'
  | 'player__id'
  | 'reward'
  | 'success'
  | 'timestamp'
  | 'transactionHash';

export type GlobalStats = {
  __typename?: 'GlobalStats';
  /**  固定 ID = 'global'  */
  id: Scalars['String']['output'];
  /**  最後更新時間戳  */
  lastUpdatedAt: Scalars['BigInt']['output'];
  /**  成功遠征次數  */
  successfulExpeditions: Scalars['Int']['output'];
  /**  成功升星次數  */
  successfulUpgrades: Scalars['Int']['output'];
  /**  總遠征次數  */
  totalExpeditions: Scalars['Int']['output'];
  /**  總英雄數 (包含已銷毀)  */
  totalHeroes: Scalars['Int']['output'];
  /**  總隊伍數 (包含已銷毀)  */
  totalParties: Scalars['Int']['output'];
  /**  總玩家數  */
  totalPlayers: Scalars['Int']['output'];
  /**  總聖物數 (包含已銷毀)  */
  totalRelics: Scalars['Int']['output'];
  /**  總獎勵發放  */
  totalRewardsDistributed: Scalars['BigInt']['output'];
  /**  總升星嘗試次數  */
  totalUpgradeAttempts: Scalars['Int']['output'];
};

export type GlobalStats_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<GlobalStats_Filter>>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  lastUpdatedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdatedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<GlobalStats_Filter>>>;
  successfulExpeditions?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_gt?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_gte?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  successfulExpeditions_lt?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_lte?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_not?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  successfulUpgrades?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_gt?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_gte?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  successfulUpgrades_lt?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_lte?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_not?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalExpeditions?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_gt?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_gte?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalExpeditions_lt?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_lte?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_not?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalHeroes?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_gt?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_gte?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalHeroes_lt?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_lte?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_not?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalParties?: InputMaybe<Scalars['Int']['input']>;
  totalParties_gt?: InputMaybe<Scalars['Int']['input']>;
  totalParties_gte?: InputMaybe<Scalars['Int']['input']>;
  totalParties_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalParties_lt?: InputMaybe<Scalars['Int']['input']>;
  totalParties_lte?: InputMaybe<Scalars['Int']['input']>;
  totalParties_not?: InputMaybe<Scalars['Int']['input']>;
  totalParties_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalPlayers?: InputMaybe<Scalars['Int']['input']>;
  totalPlayers_gt?: InputMaybe<Scalars['Int']['input']>;
  totalPlayers_gte?: InputMaybe<Scalars['Int']['input']>;
  totalPlayers_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalPlayers_lt?: InputMaybe<Scalars['Int']['input']>;
  totalPlayers_lte?: InputMaybe<Scalars['Int']['input']>;
  totalPlayers_not?: InputMaybe<Scalars['Int']['input']>;
  totalPlayers_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalRelics?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_gt?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_gte?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalRelics_lt?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_lte?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_not?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalRewardsDistributed?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsDistributed_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsDistributed_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsDistributed_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalRewardsDistributed_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsDistributed_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsDistributed_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsDistributed_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalUpgradeAttempts?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_gt?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_gte?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalUpgradeAttempts_lt?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_lte?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_not?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type GlobalStats_OrderBy =
  | 'id'
  | 'lastUpdatedAt'
  | 'successfulExpeditions'
  | 'successfulUpgrades'
  | 'totalExpeditions'
  | 'totalHeroes'
  | 'totalParties'
  | 'totalPlayers'
  | 'totalRelics'
  | 'totalRewardsDistributed'
  | 'totalUpgradeAttempts';

/**  V2Fixed Global Upgrade Stats  */
export type GlobalUpgradeStats = {
  __typename?: 'GlobalUpgradeStats';
  /**  Fixed ID = 'global'  */
  id: Scalars['String']['output'];
  /**  Last updated timestamp  */
  lastUpdated: Scalars['BigInt']['output'];
  /**  Total upgrade attempts  */
  totalAttempts: Scalars['BigInt']['output'];
  /**  Total NFTs burned  */
  totalBurned: Scalars['BigInt']['output'];
  /**  Total fees collected  */
  totalFeesCollected: Scalars['BigInt']['output'];
  /**  Total NFTs minted  */
  totalMinted: Scalars['BigInt']['output'];
};

export type GlobalUpgradeStats_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<GlobalUpgradeStats_Filter>>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  lastUpdated?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdated_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<GlobalUpgradeStats_Filter>>>;
  totalAttempts?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalAttempts_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalBurned?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalBurned_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalFeesCollected?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesCollected_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesCollected_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesCollected_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalFeesCollected_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesCollected_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesCollected_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesCollected_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalMinted?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalMinted_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type GlobalUpgradeStats_OrderBy =
  | 'id'
  | 'lastUpdated'
  | 'totalAttempts'
  | 'totalBurned'
  | 'totalFeesCollected'
  | 'totalMinted';

export type Hero = {
  __typename?: 'Hero';
  /**  銷毀時間戳  */
  burnedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  NFT 的合約地址  */
  contractAddress: Scalars['Bytes']['output'];
  /**  創建時間戳  */
  createdAt: Scalars['BigInt']['output'];
  /**  全域唯一 ID，格式為：`contractAddress-tokenId`  */
  id: Scalars['String']['output'];
  /**  是否已被銷毀  */
  isBurned: Scalars['Boolean']['output'];
  /**  最後升級時間戳  */
  lastUpgradedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  英雄的擁有者  */
  owner: Player;
  /**  戰力  */
  power: Scalars['BigInt']['output'];
  /**  稀有度 (1-5)  */
  rarity: Scalars['Int']['output'];
  /**  NFT 的 Token ID  */
  tokenId: Scalars['BigInt']['output'];
  /**  升級歷史  */
  upgradeHistory?: Maybe<Array<HeroUpgrade>>;
};


export type HeroUpgradeHistoryArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<HeroUpgrade_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<HeroUpgrade_Filter>;
};

export type HeroUpgrade = {
  __typename?: 'HeroUpgrade';
  /**  升級的英雄  */
  hero: Hero;
  /**  使用 `txHash-logIndex` 作為唯一 ID  */
  id: Scalars['String']['output'];
  /**  新戰力  */
  newPower: Scalars['BigInt']['output'];
  /**  新稀有度  */
  newRarity: Scalars['Int']['output'];
  /**  原始稀有度  */
  oldRarity: Scalars['Int']['output'];
  /**  執行升級的玩家  */
  owner: Player;
  /**  時間戳  */
  timestamp: Scalars['BigInt']['output'];
};

export type HeroUpgrade_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<HeroUpgrade_Filter>>>;
  hero?: InputMaybe<Scalars['String']['input']>;
  hero_?: InputMaybe<Hero_Filter>;
  hero_contains?: InputMaybe<Scalars['String']['input']>;
  hero_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_ends_with?: InputMaybe<Scalars['String']['input']>;
  hero_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_gt?: InputMaybe<Scalars['String']['input']>;
  hero_gte?: InputMaybe<Scalars['String']['input']>;
  hero_in?: InputMaybe<Array<Scalars['String']['input']>>;
  hero_lt?: InputMaybe<Scalars['String']['input']>;
  hero_lte?: InputMaybe<Scalars['String']['input']>;
  hero_not?: InputMaybe<Scalars['String']['input']>;
  hero_not_contains?: InputMaybe<Scalars['String']['input']>;
  hero_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  hero_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  hero_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  hero_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_starts_with?: InputMaybe<Scalars['String']['input']>;
  hero_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  newPower?: InputMaybe<Scalars['BigInt']['input']>;
  newPower_gt?: InputMaybe<Scalars['BigInt']['input']>;
  newPower_gte?: InputMaybe<Scalars['BigInt']['input']>;
  newPower_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  newPower_lt?: InputMaybe<Scalars['BigInt']['input']>;
  newPower_lte?: InputMaybe<Scalars['BigInt']['input']>;
  newPower_not?: InputMaybe<Scalars['BigInt']['input']>;
  newPower_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  newRarity?: InputMaybe<Scalars['Int']['input']>;
  newRarity_gt?: InputMaybe<Scalars['Int']['input']>;
  newRarity_gte?: InputMaybe<Scalars['Int']['input']>;
  newRarity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  newRarity_lt?: InputMaybe<Scalars['Int']['input']>;
  newRarity_lte?: InputMaybe<Scalars['Int']['input']>;
  newRarity_not?: InputMaybe<Scalars['Int']['input']>;
  newRarity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  oldRarity?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_gt?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_gte?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  oldRarity_lt?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_lte?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_not?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  or?: InputMaybe<Array<InputMaybe<HeroUpgrade_Filter>>>;
  owner?: InputMaybe<Scalars['String']['input']>;
  owner_?: InputMaybe<Player_Filter>;
  owner_contains?: InputMaybe<Scalars['String']['input']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_gt?: InputMaybe<Scalars['String']['input']>;
  owner_gte?: InputMaybe<Scalars['String']['input']>;
  owner_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_lt?: InputMaybe<Scalars['String']['input']>;
  owner_lte?: InputMaybe<Scalars['String']['input']>;
  owner_not?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type HeroUpgrade_OrderBy =
  | 'hero'
  | 'hero__burnedAt'
  | 'hero__contractAddress'
  | 'hero__createdAt'
  | 'hero__id'
  | 'hero__isBurned'
  | 'hero__lastUpgradedAt'
  | 'hero__power'
  | 'hero__rarity'
  | 'hero__tokenId'
  | 'id'
  | 'newPower'
  | 'newRarity'
  | 'oldRarity'
  | 'owner'
  | 'owner__id'
  | 'timestamp';

export type Hero_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Hero_Filter>>>;
  burnedAt?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  burnedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  contractAddress?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_contains?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_gt?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_gte?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  contractAddress_lt?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_lte?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_not?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  createdAt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  isBurned?: InputMaybe<Scalars['Boolean']['input']>;
  isBurned_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isBurned_not?: InputMaybe<Scalars['Boolean']['input']>;
  isBurned_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  lastUpgradedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpgradedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<Hero_Filter>>>;
  owner?: InputMaybe<Scalars['String']['input']>;
  owner_?: InputMaybe<Player_Filter>;
  owner_contains?: InputMaybe<Scalars['String']['input']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_gt?: InputMaybe<Scalars['String']['input']>;
  owner_gte?: InputMaybe<Scalars['String']['input']>;
  owner_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_lt?: InputMaybe<Scalars['String']['input']>;
  owner_lte?: InputMaybe<Scalars['String']['input']>;
  owner_not?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  power?: InputMaybe<Scalars['BigInt']['input']>;
  power_gt?: InputMaybe<Scalars['BigInt']['input']>;
  power_gte?: InputMaybe<Scalars['BigInt']['input']>;
  power_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  power_lt?: InputMaybe<Scalars['BigInt']['input']>;
  power_lte?: InputMaybe<Scalars['BigInt']['input']>;
  power_not?: InputMaybe<Scalars['BigInt']['input']>;
  power_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  rarity?: InputMaybe<Scalars['Int']['input']>;
  rarity_gt?: InputMaybe<Scalars['Int']['input']>;
  rarity_gte?: InputMaybe<Scalars['Int']['input']>;
  rarity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  rarity_lt?: InputMaybe<Scalars['Int']['input']>;
  rarity_lte?: InputMaybe<Scalars['Int']['input']>;
  rarity_not?: InputMaybe<Scalars['Int']['input']>;
  rarity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  tokenId?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenId_lt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_lte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_not?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  upgradeHistory_?: InputMaybe<HeroUpgrade_Filter>;
};

export type Hero_OrderBy =
  | 'burnedAt'
  | 'contractAddress'
  | 'createdAt'
  | 'id'
  | 'isBurned'
  | 'lastUpgradedAt'
  | 'owner'
  | 'owner__id'
  | 'power'
  | 'rarity'
  | 'tokenId'
  | 'upgradeHistory';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type Party = {
  __typename?: 'Party';
  /**  銷毀時間戳  */
  burnedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  NFT 的合約地址  */
  contractAddress: Scalars['Bytes']['output'];
  /**  冷卻結束時間戳  */
  cooldownEndsAt: Scalars['BigInt']['output'];
  /**  創建時間戳  */
  createdAt: Scalars['BigInt']['output'];
  /**  出征歷史紀錄  */
  expeditions?: Maybe<Array<Expedition>>;
  /**  目前配置的英雄 ID 列表  */
  heroIds: Array<Scalars['String']['output']>;
  /**  目前配置的英雄實體列表  */
  heroes: Array<Hero>;
  /**  全域唯一 ID，格式為：`contractAddress-tokenId`  */
  id: Scalars['String']['output'];
  /**  是否已被銷毀  */
  isBurned: Scalars['Boolean']['output'];
  /**  最後更新時間戳 (配置英雄或改名)  */
  lastUpdatedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  成員變更歷史  */
  memberChanges?: Maybe<Array<PartyMemberChange>>;
  /**  隊伍名稱  */
  name: Scalars['String']['output'];
  /**  隊伍的擁有者  */
  owner: Player;
  /**  隊伍稀有度 (1-5)  */
  partyRarity: Scalars['Int']['output'];
  /**  剩餘補給品數量  */
  provisionsRemaining: Scalars['Int']['output'];
  /**  目前配置的聖物 ID 列表  */
  relicIds: Array<Scalars['String']['output']>;
  /**  目前配置的聖物實體列表  */
  relics: Array<Relic>;
  /**  NFT 的 Token ID  */
  tokenId: Scalars['BigInt']['output'];
  /**  總容量 (基於聖物)  */
  totalCapacity: Scalars['BigInt']['output'];
  /**  總戰力  */
  totalPower: Scalars['BigInt']['output'];
  /**  未領取的獎勵 (SoulShard 數量)  */
  unclaimedRewards: Scalars['BigInt']['output'];
};


export type PartyExpeditionsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Expedition_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Expedition_Filter>;
};


export type PartyHeroesArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Hero_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Hero_Filter>;
};


export type PartyMemberChangesArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PartyMemberChange_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PartyMemberChange_Filter>;
};


export type PartyRelicsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Relic_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Relic_Filter>;
};

export type PartyMemberChange = {
  __typename?: 'PartyMemberChange';
  /**  變更類型 (0: 添加, 1: 移除)  */
  changeType: Scalars['Int']['output'];
  /**  相關的英雄  */
  hero: Hero;
  /**  使用 `txHash-logIndex` 作為唯一 ID  */
  id: Scalars['String']['output'];
  /**  執行變更的玩家  */
  owner: Player;
  /**  變更的隊伍  */
  party: Party;
  /**  時間戳  */
  timestamp: Scalars['BigInt']['output'];
};

export type PartyMemberChange_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<PartyMemberChange_Filter>>>;
  changeType?: InputMaybe<Scalars['Int']['input']>;
  changeType_gt?: InputMaybe<Scalars['Int']['input']>;
  changeType_gte?: InputMaybe<Scalars['Int']['input']>;
  changeType_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  changeType_lt?: InputMaybe<Scalars['Int']['input']>;
  changeType_lte?: InputMaybe<Scalars['Int']['input']>;
  changeType_not?: InputMaybe<Scalars['Int']['input']>;
  changeType_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  hero?: InputMaybe<Scalars['String']['input']>;
  hero_?: InputMaybe<Hero_Filter>;
  hero_contains?: InputMaybe<Scalars['String']['input']>;
  hero_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_ends_with?: InputMaybe<Scalars['String']['input']>;
  hero_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_gt?: InputMaybe<Scalars['String']['input']>;
  hero_gte?: InputMaybe<Scalars['String']['input']>;
  hero_in?: InputMaybe<Array<Scalars['String']['input']>>;
  hero_lt?: InputMaybe<Scalars['String']['input']>;
  hero_lte?: InputMaybe<Scalars['String']['input']>;
  hero_not?: InputMaybe<Scalars['String']['input']>;
  hero_not_contains?: InputMaybe<Scalars['String']['input']>;
  hero_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  hero_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  hero_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  hero_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  hero_starts_with?: InputMaybe<Scalars['String']['input']>;
  hero_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<InputMaybe<PartyMemberChange_Filter>>>;
  owner?: InputMaybe<Scalars['String']['input']>;
  owner_?: InputMaybe<Player_Filter>;
  owner_contains?: InputMaybe<Scalars['String']['input']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_gt?: InputMaybe<Scalars['String']['input']>;
  owner_gte?: InputMaybe<Scalars['String']['input']>;
  owner_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_lt?: InputMaybe<Scalars['String']['input']>;
  owner_lte?: InputMaybe<Scalars['String']['input']>;
  owner_not?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  party?: InputMaybe<Scalars['String']['input']>;
  party_?: InputMaybe<Party_Filter>;
  party_contains?: InputMaybe<Scalars['String']['input']>;
  party_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  party_ends_with?: InputMaybe<Scalars['String']['input']>;
  party_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  party_gt?: InputMaybe<Scalars['String']['input']>;
  party_gte?: InputMaybe<Scalars['String']['input']>;
  party_in?: InputMaybe<Array<Scalars['String']['input']>>;
  party_lt?: InputMaybe<Scalars['String']['input']>;
  party_lte?: InputMaybe<Scalars['String']['input']>;
  party_not?: InputMaybe<Scalars['String']['input']>;
  party_not_contains?: InputMaybe<Scalars['String']['input']>;
  party_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  party_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  party_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  party_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  party_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  party_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  party_starts_with?: InputMaybe<Scalars['String']['input']>;
  party_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type PartyMemberChange_OrderBy =
  | 'changeType'
  | 'hero'
  | 'hero__burnedAt'
  | 'hero__contractAddress'
  | 'hero__createdAt'
  | 'hero__id'
  | 'hero__isBurned'
  | 'hero__lastUpgradedAt'
  | 'hero__power'
  | 'hero__rarity'
  | 'hero__tokenId'
  | 'id'
  | 'owner'
  | 'owner__id'
  | 'party'
  | 'party__burnedAt'
  | 'party__contractAddress'
  | 'party__cooldownEndsAt'
  | 'party__createdAt'
  | 'party__id'
  | 'party__isBurned'
  | 'party__lastUpdatedAt'
  | 'party__name'
  | 'party__partyRarity'
  | 'party__provisionsRemaining'
  | 'party__tokenId'
  | 'party__totalCapacity'
  | 'party__totalPower'
  | 'party__unclaimedRewards'
  | 'timestamp';

export type Party_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Party_Filter>>>;
  burnedAt?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  burnedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  contractAddress?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_contains?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_gt?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_gte?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  contractAddress_lt?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_lte?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_not?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  cooldownEndsAt?: InputMaybe<Scalars['BigInt']['input']>;
  cooldownEndsAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  cooldownEndsAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  cooldownEndsAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  cooldownEndsAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  cooldownEndsAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  cooldownEndsAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  cooldownEndsAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  createdAt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  expeditions_?: InputMaybe<Expedition_Filter>;
  heroIds?: InputMaybe<Array<Scalars['String']['input']>>;
  heroIds_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  heroIds_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  heroIds_not?: InputMaybe<Array<Scalars['String']['input']>>;
  heroIds_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  heroIds_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  heroes?: InputMaybe<Array<Scalars['String']['input']>>;
  heroes_?: InputMaybe<Hero_Filter>;
  heroes_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  heroes_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  heroes_not?: InputMaybe<Array<Scalars['String']['input']>>;
  heroes_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  heroes_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  isBurned?: InputMaybe<Scalars['Boolean']['input']>;
  isBurned_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isBurned_not?: InputMaybe<Scalars['Boolean']['input']>;
  isBurned_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  lastUpdatedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdatedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  memberChanges_?: InputMaybe<PartyMemberChange_Filter>;
  name?: InputMaybe<Scalars['String']['input']>;
  name_contains?: InputMaybe<Scalars['String']['input']>;
  name_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_gt?: InputMaybe<Scalars['String']['input']>;
  name_gte?: InputMaybe<Scalars['String']['input']>;
  name_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_lt?: InputMaybe<Scalars['String']['input']>;
  name_lte?: InputMaybe<Scalars['String']['input']>;
  name_not?: InputMaybe<Scalars['String']['input']>;
  name_not_contains?: InputMaybe<Scalars['String']['input']>;
  name_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<InputMaybe<Party_Filter>>>;
  owner?: InputMaybe<Scalars['String']['input']>;
  owner_?: InputMaybe<Player_Filter>;
  owner_contains?: InputMaybe<Scalars['String']['input']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_gt?: InputMaybe<Scalars['String']['input']>;
  owner_gte?: InputMaybe<Scalars['String']['input']>;
  owner_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_lt?: InputMaybe<Scalars['String']['input']>;
  owner_lte?: InputMaybe<Scalars['String']['input']>;
  owner_not?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  partyRarity?: InputMaybe<Scalars['Int']['input']>;
  partyRarity_gt?: InputMaybe<Scalars['Int']['input']>;
  partyRarity_gte?: InputMaybe<Scalars['Int']['input']>;
  partyRarity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  partyRarity_lt?: InputMaybe<Scalars['Int']['input']>;
  partyRarity_lte?: InputMaybe<Scalars['Int']['input']>;
  partyRarity_not?: InputMaybe<Scalars['Int']['input']>;
  partyRarity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  provisionsRemaining?: InputMaybe<Scalars['Int']['input']>;
  provisionsRemaining_gt?: InputMaybe<Scalars['Int']['input']>;
  provisionsRemaining_gte?: InputMaybe<Scalars['Int']['input']>;
  provisionsRemaining_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  provisionsRemaining_lt?: InputMaybe<Scalars['Int']['input']>;
  provisionsRemaining_lte?: InputMaybe<Scalars['Int']['input']>;
  provisionsRemaining_not?: InputMaybe<Scalars['Int']['input']>;
  provisionsRemaining_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  relicIds?: InputMaybe<Array<Scalars['String']['input']>>;
  relicIds_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  relicIds_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  relicIds_not?: InputMaybe<Array<Scalars['String']['input']>>;
  relicIds_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  relicIds_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  relics?: InputMaybe<Array<Scalars['String']['input']>>;
  relics_?: InputMaybe<Relic_Filter>;
  relics_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  relics_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  relics_not?: InputMaybe<Array<Scalars['String']['input']>>;
  relics_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  relics_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  tokenId?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenId_lt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_lte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_not?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalCapacity?: InputMaybe<Scalars['BigInt']['input']>;
  totalCapacity_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalCapacity_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalCapacity_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalCapacity_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalCapacity_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalCapacity_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalCapacity_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalPower?: InputMaybe<Scalars['BigInt']['input']>;
  totalPower_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalPower_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalPower_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalPower_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalPower_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalPower_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalPower_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  unclaimedRewards?: InputMaybe<Scalars['BigInt']['input']>;
  unclaimedRewards_gt?: InputMaybe<Scalars['BigInt']['input']>;
  unclaimedRewards_gte?: InputMaybe<Scalars['BigInt']['input']>;
  unclaimedRewards_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  unclaimedRewards_lt?: InputMaybe<Scalars['BigInt']['input']>;
  unclaimedRewards_lte?: InputMaybe<Scalars['BigInt']['input']>;
  unclaimedRewards_not?: InputMaybe<Scalars['BigInt']['input']>;
  unclaimedRewards_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type Party_OrderBy =
  | 'burnedAt'
  | 'contractAddress'
  | 'cooldownEndsAt'
  | 'createdAt'
  | 'expeditions'
  | 'heroIds'
  | 'heroes'
  | 'id'
  | 'isBurned'
  | 'lastUpdatedAt'
  | 'memberChanges'
  | 'name'
  | 'owner'
  | 'owner__id'
  | 'partyRarity'
  | 'provisionsRemaining'
  | 'relicIds'
  | 'relics'
  | 'tokenId'
  | 'totalCapacity'
  | 'totalPower'
  | 'unclaimedRewards';

export type Player = {
  __typename?: 'Player';
  /**  玩家的所有出征紀錄  */
  expeditions?: Maybe<Array<Expedition>>;
  /**  玩家擁有的所有英雄  */
  heros?: Maybe<Array<Hero>>;
  /**  玩家的錢包地址  */
  id: Scalars['Bytes']['output'];
  /**  玩家擁有的所有隊伍  */
  parties?: Maybe<Array<Party>>;
  /**  玩家的個人檔案 (SBT)，一個玩家只會有一個  */
  profile?: Maybe<PlayerProfile>;
  /**  玩家擁有的所有聖物  */
  relics?: Maybe<Array<Relic>>;
  /**  玩家的統計數據  */
  stats?: Maybe<PlayerStats>;
  /**  玩家的所有升星嘗試紀錄  */
  upgradeAttempts?: Maybe<Array<UpgradeAttempt>>;
  /**  玩家的金庫  */
  vault?: Maybe<PlayerVault>;
  /**  玩家的 VIP 卡 (SBT)，一個玩家只會有一個  */
  vip?: Maybe<Vip>;
};


export type PlayerExpeditionsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Expedition_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Expedition_Filter>;
};


export type PlayerHerosArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Hero_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Hero_Filter>;
};


export type PlayerPartiesArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Party_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Party_Filter>;
};


export type PlayerRelicsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Relic_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Relic_Filter>;
};


export type PlayerUpgradeAttemptsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<UpgradeAttempt_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UpgradeAttempt_Filter>;
};

export type PlayerProfile = {
  __typename?: 'PlayerProfile';
  /**  佣金獲得總額  */
  commissionEarned: Scalars['BigInt']['output'];
  /**  創建時間戳  */
  createdAt: Scalars['BigInt']['output'];
  /**  總經驗值  */
  experience: Scalars['BigInt']['output'];
  /**  使用錢包地址作為 ID  */
  id: Scalars['Bytes']['output'];
  /**  被邀請的玩家列表  */
  invitees: Array<Scalars['Bytes']['output']>;
  /**  邀請人地址  */
  inviter?: Maybe<Scalars['Bytes']['output']>;
  /**  最後更新時間戳  */
  lastUpdatedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  玩家等級 (根據經驗值計算)  */
  level: Scalars['Int']['output'];
  /**  玩家設定的名稱  */
  name: Scalars['String']['output'];
  /**  擁有者  */
  owner: Player;
  /**  成功的遠征次數  */
  successfulExpeditions: Scalars['Int']['output'];
  /**  總獲得獎勵  */
  totalRewardsEarned: Scalars['BigInt']['output'];
};

export type PlayerProfile_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<PlayerProfile_Filter>>>;
  commissionEarned?: InputMaybe<Scalars['BigInt']['input']>;
  commissionEarned_gt?: InputMaybe<Scalars['BigInt']['input']>;
  commissionEarned_gte?: InputMaybe<Scalars['BigInt']['input']>;
  commissionEarned_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  commissionEarned_lt?: InputMaybe<Scalars['BigInt']['input']>;
  commissionEarned_lte?: InputMaybe<Scalars['BigInt']['input']>;
  commissionEarned_not?: InputMaybe<Scalars['BigInt']['input']>;
  commissionEarned_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  createdAt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  experience?: InputMaybe<Scalars['BigInt']['input']>;
  experience_gt?: InputMaybe<Scalars['BigInt']['input']>;
  experience_gte?: InputMaybe<Scalars['BigInt']['input']>;
  experience_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  experience_lt?: InputMaybe<Scalars['BigInt']['input']>;
  experience_lte?: InputMaybe<Scalars['BigInt']['input']>;
  experience_not?: InputMaybe<Scalars['BigInt']['input']>;
  experience_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  invitees?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  invitees_contains?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  invitees_contains_nocase?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  invitees_not?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  invitees_not_contains?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  invitees_not_contains_nocase?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  inviter?: InputMaybe<Scalars['Bytes']['input']>;
  inviter_contains?: InputMaybe<Scalars['Bytes']['input']>;
  inviter_gt?: InputMaybe<Scalars['Bytes']['input']>;
  inviter_gte?: InputMaybe<Scalars['Bytes']['input']>;
  inviter_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  inviter_lt?: InputMaybe<Scalars['Bytes']['input']>;
  inviter_lte?: InputMaybe<Scalars['Bytes']['input']>;
  inviter_not?: InputMaybe<Scalars['Bytes']['input']>;
  inviter_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  inviter_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  lastUpdatedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdatedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  level?: InputMaybe<Scalars['Int']['input']>;
  level_gt?: InputMaybe<Scalars['Int']['input']>;
  level_gte?: InputMaybe<Scalars['Int']['input']>;
  level_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  level_lt?: InputMaybe<Scalars['Int']['input']>;
  level_lte?: InputMaybe<Scalars['Int']['input']>;
  level_not?: InputMaybe<Scalars['Int']['input']>;
  level_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
  name_contains?: InputMaybe<Scalars['String']['input']>;
  name_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_gt?: InputMaybe<Scalars['String']['input']>;
  name_gte?: InputMaybe<Scalars['String']['input']>;
  name_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_lt?: InputMaybe<Scalars['String']['input']>;
  name_lte?: InputMaybe<Scalars['String']['input']>;
  name_not?: InputMaybe<Scalars['String']['input']>;
  name_not_contains?: InputMaybe<Scalars['String']['input']>;
  name_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<InputMaybe<PlayerProfile_Filter>>>;
  owner?: InputMaybe<Scalars['String']['input']>;
  owner_?: InputMaybe<Player_Filter>;
  owner_contains?: InputMaybe<Scalars['String']['input']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_gt?: InputMaybe<Scalars['String']['input']>;
  owner_gte?: InputMaybe<Scalars['String']['input']>;
  owner_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_lt?: InputMaybe<Scalars['String']['input']>;
  owner_lte?: InputMaybe<Scalars['String']['input']>;
  owner_not?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  successfulExpeditions?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_gt?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_gte?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  successfulExpeditions_lt?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_lte?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_not?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalRewardsEarned?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalRewardsEarned_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type PlayerProfile_OrderBy =
  | 'commissionEarned'
  | 'createdAt'
  | 'experience'
  | 'id'
  | 'invitees'
  | 'inviter'
  | 'lastUpdatedAt'
  | 'level'
  | 'name'
  | 'owner'
  | 'owner__id'
  | 'successfulExpeditions'
  | 'totalRewardsEarned';

export type PlayerStats = {
  __typename?: 'PlayerStats';
  /**  最高隊伍戰力  */
  highestPartyPower: Scalars['BigInt']['output'];
  /**  使用錢包地址作為 ID  */
  id: Scalars['Bytes']['output'];
  /**  最後活動時間戳  */
  lastActivityAt: Scalars['BigInt']['output'];
  /**  關聯的玩家  */
  player: Player;
  /**  成功遠征次數  */
  successfulExpeditions: Scalars['Int']['output'];
  /**  成功升星次數  */
  successfulUpgrades: Scalars['Int']['output'];
  /**  總遠征次數  */
  totalExpeditions: Scalars['Int']['output'];
  /**  總擁有英雄數 (不含已銷毀)  */
  totalHeroes: Scalars['Int']['output'];
  /**  總擁有隊伍數 (不含已銷毀)  */
  totalParties: Scalars['Int']['output'];
  /**  總擁有聖物數 (不含已銷毀)  */
  totalRelics: Scalars['Int']['output'];
  /**  總獲得獎勵  */
  totalRewardsEarned: Scalars['BigInt']['output'];
  /**  總升星嘗試次數  */
  totalUpgradeAttempts: Scalars['Int']['output'];
};

export type PlayerStats_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<PlayerStats_Filter>>>;
  highestPartyPower?: InputMaybe<Scalars['BigInt']['input']>;
  highestPartyPower_gt?: InputMaybe<Scalars['BigInt']['input']>;
  highestPartyPower_gte?: InputMaybe<Scalars['BigInt']['input']>;
  highestPartyPower_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  highestPartyPower_lt?: InputMaybe<Scalars['BigInt']['input']>;
  highestPartyPower_lte?: InputMaybe<Scalars['BigInt']['input']>;
  highestPartyPower_not?: InputMaybe<Scalars['BigInt']['input']>;
  highestPartyPower_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  lastActivityAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastActivityAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastActivityAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastActivityAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastActivityAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastActivityAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastActivityAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastActivityAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<PlayerStats_Filter>>>;
  player?: InputMaybe<Scalars['String']['input']>;
  player_?: InputMaybe<Player_Filter>;
  player_contains?: InputMaybe<Scalars['String']['input']>;
  player_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  player_ends_with?: InputMaybe<Scalars['String']['input']>;
  player_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player_gt?: InputMaybe<Scalars['String']['input']>;
  player_gte?: InputMaybe<Scalars['String']['input']>;
  player_in?: InputMaybe<Array<Scalars['String']['input']>>;
  player_lt?: InputMaybe<Scalars['String']['input']>;
  player_lte?: InputMaybe<Scalars['String']['input']>;
  player_not?: InputMaybe<Scalars['String']['input']>;
  player_not_contains?: InputMaybe<Scalars['String']['input']>;
  player_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  player_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  player_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  player_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  player_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player_starts_with?: InputMaybe<Scalars['String']['input']>;
  player_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  successfulExpeditions?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_gt?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_gte?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  successfulExpeditions_lt?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_lte?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_not?: InputMaybe<Scalars['Int']['input']>;
  successfulExpeditions_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  successfulUpgrades?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_gt?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_gte?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  successfulUpgrades_lt?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_lte?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_not?: InputMaybe<Scalars['Int']['input']>;
  successfulUpgrades_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalExpeditions?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_gt?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_gte?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalExpeditions_lt?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_lte?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_not?: InputMaybe<Scalars['Int']['input']>;
  totalExpeditions_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalHeroes?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_gt?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_gte?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalHeroes_lt?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_lte?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_not?: InputMaybe<Scalars['Int']['input']>;
  totalHeroes_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalParties?: InputMaybe<Scalars['Int']['input']>;
  totalParties_gt?: InputMaybe<Scalars['Int']['input']>;
  totalParties_gte?: InputMaybe<Scalars['Int']['input']>;
  totalParties_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalParties_lt?: InputMaybe<Scalars['Int']['input']>;
  totalParties_lte?: InputMaybe<Scalars['Int']['input']>;
  totalParties_not?: InputMaybe<Scalars['Int']['input']>;
  totalParties_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalRelics?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_gt?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_gte?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalRelics_lt?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_lte?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_not?: InputMaybe<Scalars['Int']['input']>;
  totalRelics_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalRewardsEarned?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalRewardsEarned_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalRewardsEarned_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalUpgradeAttempts?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_gt?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_gte?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalUpgradeAttempts_lt?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_lte?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_not?: InputMaybe<Scalars['Int']['input']>;
  totalUpgradeAttempts_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type PlayerStats_OrderBy =
  | 'highestPartyPower'
  | 'id'
  | 'lastActivityAt'
  | 'player'
  | 'player__id'
  | 'successfulExpeditions'
  | 'successfulUpgrades'
  | 'totalExpeditions'
  | 'totalHeroes'
  | 'totalParties'
  | 'totalRelics'
  | 'totalRewardsEarned'
  | 'totalUpgradeAttempts';

/**  V2Fixed Player Upgrade Stats  */
export type PlayerUpgradeStats = {
  __typename?: 'PlayerUpgradeStats';
  /**  Player address as ID  */
  id: Scalars['String']['output'];
  /**  Last updated timestamp  */
  lastUpdated: Scalars['BigInt']['output'];
  /**  Total upgrade attempts  */
  totalAttempts: Scalars['BigInt']['output'];
  /**  Total NFTs burned  */
  totalBurned: Scalars['BigInt']['output'];
  /**  Total fees spent  */
  totalFeesSpent: Scalars['BigInt']['output'];
  /**  Total NFTs minted  */
  totalMinted: Scalars['BigInt']['output'];
};

export type PlayerUpgradeStats_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<PlayerUpgradeStats_Filter>>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  lastUpdated?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdated_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdated_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<PlayerUpgradeStats_Filter>>>;
  totalAttempts?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalAttempts_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalAttempts_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalBurned?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalBurned_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalBurned_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalFeesSpent?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesSpent_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesSpent_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesSpent_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalFeesSpent_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesSpent_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesSpent_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalFeesSpent_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalMinted?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalMinted_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalMinted_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type PlayerUpgradeStats_OrderBy =
  | 'id'
  | 'lastUpdated'
  | 'totalAttempts'
  | 'totalBurned'
  | 'totalFeesSpent'
  | 'totalMinted';

export type PlayerVault = {
  __typename?: 'PlayerVault';
  /**  已領取的總獎勵  */
  claimedRewards: Scalars['BigInt']['output'];
  /**  創建時間戳  */
  createdAt: Scalars['BigInt']['output'];
  /**  使用錢包地址作為 ID  */
  id: Scalars['Bytes']['output'];
  /**  最後領取時間戳  */
  lastClaimedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  最後更新時間戳  */
  lastUpdatedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  擁有者  */
  owner: Player;
  /**  待領取的總獎勵  */
  pendingRewards: Scalars['BigInt']['output'];
  /**  總儲備花費  */
  totalProvisionSpent: Scalars['BigInt']['output'];
};

export type PlayerVault_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<PlayerVault_Filter>>>;
  claimedRewards?: InputMaybe<Scalars['BigInt']['input']>;
  claimedRewards_gt?: InputMaybe<Scalars['BigInt']['input']>;
  claimedRewards_gte?: InputMaybe<Scalars['BigInt']['input']>;
  claimedRewards_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  claimedRewards_lt?: InputMaybe<Scalars['BigInt']['input']>;
  claimedRewards_lte?: InputMaybe<Scalars['BigInt']['input']>;
  claimedRewards_not?: InputMaybe<Scalars['BigInt']['input']>;
  claimedRewards_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  createdAt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  lastClaimedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastClaimedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastClaimedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastClaimedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastClaimedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastClaimedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastClaimedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastClaimedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdatedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdatedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<PlayerVault_Filter>>>;
  owner?: InputMaybe<Scalars['String']['input']>;
  owner_?: InputMaybe<Player_Filter>;
  owner_contains?: InputMaybe<Scalars['String']['input']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_gt?: InputMaybe<Scalars['String']['input']>;
  owner_gte?: InputMaybe<Scalars['String']['input']>;
  owner_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_lt?: InputMaybe<Scalars['String']['input']>;
  owner_lte?: InputMaybe<Scalars['String']['input']>;
  owner_not?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  pendingRewards?: InputMaybe<Scalars['BigInt']['input']>;
  pendingRewards_gt?: InputMaybe<Scalars['BigInt']['input']>;
  pendingRewards_gte?: InputMaybe<Scalars['BigInt']['input']>;
  pendingRewards_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  pendingRewards_lt?: InputMaybe<Scalars['BigInt']['input']>;
  pendingRewards_lte?: InputMaybe<Scalars['BigInt']['input']>;
  pendingRewards_not?: InputMaybe<Scalars['BigInt']['input']>;
  pendingRewards_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalProvisionSpent?: InputMaybe<Scalars['BigInt']['input']>;
  totalProvisionSpent_gt?: InputMaybe<Scalars['BigInt']['input']>;
  totalProvisionSpent_gte?: InputMaybe<Scalars['BigInt']['input']>;
  totalProvisionSpent_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalProvisionSpent_lt?: InputMaybe<Scalars['BigInt']['input']>;
  totalProvisionSpent_lte?: InputMaybe<Scalars['BigInt']['input']>;
  totalProvisionSpent_not?: InputMaybe<Scalars['BigInt']['input']>;
  totalProvisionSpent_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type PlayerVault_OrderBy =
  | 'claimedRewards'
  | 'createdAt'
  | 'id'
  | 'lastClaimedAt'
  | 'lastUpdatedAt'
  | 'owner'
  | 'owner__id'
  | 'pendingRewards'
  | 'totalProvisionSpent';

export type Player_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Player_Filter>>>;
  expeditions_?: InputMaybe<Expedition_Filter>;
  heros_?: InputMaybe<Hero_Filter>;
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  or?: InputMaybe<Array<InputMaybe<Player_Filter>>>;
  parties_?: InputMaybe<Party_Filter>;
  profile?: InputMaybe<Scalars['String']['input']>;
  profile_?: InputMaybe<PlayerProfile_Filter>;
  profile_contains?: InputMaybe<Scalars['String']['input']>;
  profile_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  profile_ends_with?: InputMaybe<Scalars['String']['input']>;
  profile_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  profile_gt?: InputMaybe<Scalars['String']['input']>;
  profile_gte?: InputMaybe<Scalars['String']['input']>;
  profile_in?: InputMaybe<Array<Scalars['String']['input']>>;
  profile_lt?: InputMaybe<Scalars['String']['input']>;
  profile_lte?: InputMaybe<Scalars['String']['input']>;
  profile_not?: InputMaybe<Scalars['String']['input']>;
  profile_not_contains?: InputMaybe<Scalars['String']['input']>;
  profile_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  profile_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  profile_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  profile_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  profile_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  profile_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  profile_starts_with?: InputMaybe<Scalars['String']['input']>;
  profile_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  relics_?: InputMaybe<Relic_Filter>;
  stats_?: InputMaybe<PlayerStats_Filter>;
  upgradeAttempts_?: InputMaybe<UpgradeAttempt_Filter>;
  vault?: InputMaybe<Scalars['String']['input']>;
  vault_?: InputMaybe<PlayerVault_Filter>;
  vault_contains?: InputMaybe<Scalars['String']['input']>;
  vault_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_ends_with?: InputMaybe<Scalars['String']['input']>;
  vault_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_gt?: InputMaybe<Scalars['String']['input']>;
  vault_gte?: InputMaybe<Scalars['String']['input']>;
  vault_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vault_lt?: InputMaybe<Scalars['String']['input']>;
  vault_lte?: InputMaybe<Scalars['String']['input']>;
  vault_not?: InputMaybe<Scalars['String']['input']>;
  vault_not_contains?: InputMaybe<Scalars['String']['input']>;
  vault_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  vault_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vault_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  vault_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vault_starts_with?: InputMaybe<Scalars['String']['input']>;
  vault_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vip?: InputMaybe<Scalars['String']['input']>;
  vip_?: InputMaybe<Vip_Filter>;
  vip_contains?: InputMaybe<Scalars['String']['input']>;
  vip_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vip_ends_with?: InputMaybe<Scalars['String']['input']>;
  vip_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vip_gt?: InputMaybe<Scalars['String']['input']>;
  vip_gte?: InputMaybe<Scalars['String']['input']>;
  vip_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vip_lt?: InputMaybe<Scalars['String']['input']>;
  vip_lte?: InputMaybe<Scalars['String']['input']>;
  vip_not?: InputMaybe<Scalars['String']['input']>;
  vip_not_contains?: InputMaybe<Scalars['String']['input']>;
  vip_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  vip_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  vip_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vip_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  vip_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  vip_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vip_starts_with?: InputMaybe<Scalars['String']['input']>;
  vip_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
};

export type Player_OrderBy =
  | 'expeditions'
  | 'heros'
  | 'id'
  | 'parties'
  | 'profile'
  | 'profile__commissionEarned'
  | 'profile__createdAt'
  | 'profile__experience'
  | 'profile__id'
  | 'profile__inviter'
  | 'profile__lastUpdatedAt'
  | 'profile__level'
  | 'profile__name'
  | 'profile__successfulExpeditions'
  | 'profile__totalRewardsEarned'
  | 'relics'
  | 'stats'
  | 'stats__highestPartyPower'
  | 'stats__id'
  | 'stats__lastActivityAt'
  | 'stats__successfulExpeditions'
  | 'stats__successfulUpgrades'
  | 'stats__totalExpeditions'
  | 'stats__totalHeroes'
  | 'stats__totalParties'
  | 'stats__totalRelics'
  | 'stats__totalRewardsEarned'
  | 'stats__totalUpgradeAttempts'
  | 'upgradeAttempts'
  | 'vault'
  | 'vault__claimedRewards'
  | 'vault__createdAt'
  | 'vault__id'
  | 'vault__lastClaimedAt'
  | 'vault__lastUpdatedAt'
  | 'vault__pendingRewards'
  | 'vault__totalProvisionSpent'
  | 'vip'
  | 'vip__createdAt'
  | 'vip__id'
  | 'vip__isUnlocking'
  | 'vip__lastUpdatedAt'
  | 'vip__stakedAmount'
  | 'vip__stakedAt'
  | 'vip__unlockRequestedAt'
  | 'vip__unlockTime';

export type Query = {
  __typename?: 'Query';
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
  adminAction?: Maybe<AdminAction>;
  adminActions: Array<AdminAction>;
  adminParameters?: Maybe<AdminParameters>;
  adminParameters_collection: Array<AdminParameters>;
  contractRegistries: Array<ContractRegistry>;
  contractRegistry?: Maybe<ContractRegistry>;
  expedition?: Maybe<Expedition>;
  expeditions: Array<Expedition>;
  globalStats?: Maybe<GlobalStats>;
  globalStats_collection: Array<GlobalStats>;
  globalUpgradeStats?: Maybe<GlobalUpgradeStats>;
  globalUpgradeStats_collection: Array<GlobalUpgradeStats>;
  hero?: Maybe<Hero>;
  heroUpgrade?: Maybe<HeroUpgrade>;
  heroUpgrades: Array<HeroUpgrade>;
  heros: Array<Hero>;
  parties: Array<Party>;
  party?: Maybe<Party>;
  partyMemberChange?: Maybe<PartyMemberChange>;
  partyMemberChanges: Array<PartyMemberChange>;
  player?: Maybe<Player>;
  playerProfile?: Maybe<PlayerProfile>;
  playerProfiles: Array<PlayerProfile>;
  playerStats?: Maybe<PlayerStats>;
  playerStats_collection: Array<PlayerStats>;
  playerUpgradeStats?: Maybe<PlayerUpgradeStats>;
  playerUpgradeStats_collection: Array<PlayerUpgradeStats>;
  playerVault?: Maybe<PlayerVault>;
  playerVaults: Array<PlayerVault>;
  players: Array<Player>;
  relic?: Maybe<Relic>;
  relicUpgrade?: Maybe<RelicUpgrade>;
  relicUpgrades: Array<RelicUpgrade>;
  relics: Array<Relic>;
  upgradeAttempt?: Maybe<UpgradeAttempt>;
  upgradeAttempts: Array<UpgradeAttempt>;
  vip?: Maybe<Vip>;
  vips: Array<Vip>;
};


export type Query_MetaArgs = {
  block?: InputMaybe<Block_Height>;
};


export type QueryAdminActionArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryAdminActionsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<AdminAction_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<AdminAction_Filter>;
};


export type QueryAdminParametersArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryAdminParameters_CollectionArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<AdminParameters_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<AdminParameters_Filter>;
};


export type QueryContractRegistriesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<ContractRegistry_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<ContractRegistry_Filter>;
};


export type QueryContractRegistryArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryExpeditionArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryExpeditionsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Expedition_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Expedition_Filter>;
};


export type QueryGlobalStatsArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryGlobalStats_CollectionArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<GlobalStats_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<GlobalStats_Filter>;
};


export type QueryGlobalUpgradeStatsArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryGlobalUpgradeStats_CollectionArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<GlobalUpgradeStats_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<GlobalUpgradeStats_Filter>;
};


export type QueryHeroArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryHeroUpgradeArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryHeroUpgradesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<HeroUpgrade_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<HeroUpgrade_Filter>;
};


export type QueryHerosArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Hero_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Hero_Filter>;
};


export type QueryPartiesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Party_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Party_Filter>;
};


export type QueryPartyArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryPartyMemberChangeArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryPartyMemberChangesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PartyMemberChange_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<PartyMemberChange_Filter>;
};


export type QueryPlayerArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryPlayerProfileArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryPlayerProfilesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PlayerProfile_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<PlayerProfile_Filter>;
};


export type QueryPlayerStatsArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryPlayerStats_CollectionArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PlayerStats_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<PlayerStats_Filter>;
};


export type QueryPlayerUpgradeStatsArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryPlayerUpgradeStats_CollectionArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PlayerUpgradeStats_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<PlayerUpgradeStats_Filter>;
};


export type QueryPlayerVaultArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryPlayerVaultsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PlayerVault_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<PlayerVault_Filter>;
};


export type QueryPlayersArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Player_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Player_Filter>;
};


export type QueryRelicArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryRelicUpgradeArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryRelicUpgradesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<RelicUpgrade_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<RelicUpgrade_Filter>;
};


export type QueryRelicsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Relic_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Relic_Filter>;
};


export type QueryUpgradeAttemptArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryUpgradeAttemptsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<UpgradeAttempt_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<UpgradeAttempt_Filter>;
};


export type QueryVipArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryVipsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Vip_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Vip_Filter>;
};

export type Relic = {
  __typename?: 'Relic';
  /**  銷毀時間戳  */
  burnedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  儲備容量  */
  capacity: Scalars['Int']['output'];
  /**  NFT 的合約地址  */
  contractAddress: Scalars['Bytes']['output'];
  /**  創建時間戳  */
  createdAt: Scalars['BigInt']['output'];
  /**  全域唯一 ID，格式為：`contractAddress-tokenId`  */
  id: Scalars['String']['output'];
  /**  是否已被銷毀  */
  isBurned: Scalars['Boolean']['output'];
  /**  最後升級時間戳  */
  lastUpgradedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  聖物的擁有者  */
  owner: Player;
  /**  稀有度 (1-5)  */
  rarity: Scalars['Int']['output'];
  /**  NFT 的 Token ID  */
  tokenId: Scalars['BigInt']['output'];
  /**  升級歷史  */
  upgradeHistory?: Maybe<Array<RelicUpgrade>>;
};


export type RelicUpgradeHistoryArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<RelicUpgrade_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<RelicUpgrade_Filter>;
};

export type RelicUpgrade = {
  __typename?: 'RelicUpgrade';
  /**  使用 `txHash-logIndex` 作為唯一 ID  */
  id: Scalars['String']['output'];
  /**  新容量  */
  newCapacity: Scalars['Int']['output'];
  /**  新稀有度  */
  newRarity: Scalars['Int']['output'];
  /**  原始稀有度  */
  oldRarity: Scalars['Int']['output'];
  /**  執行升級的玩家  */
  owner: Player;
  /**  升級的聖物  */
  relic: Relic;
  /**  時間戳  */
  timestamp: Scalars['BigInt']['output'];
};

export type RelicUpgrade_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<RelicUpgrade_Filter>>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  newCapacity?: InputMaybe<Scalars['Int']['input']>;
  newCapacity_gt?: InputMaybe<Scalars['Int']['input']>;
  newCapacity_gte?: InputMaybe<Scalars['Int']['input']>;
  newCapacity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  newCapacity_lt?: InputMaybe<Scalars['Int']['input']>;
  newCapacity_lte?: InputMaybe<Scalars['Int']['input']>;
  newCapacity_not?: InputMaybe<Scalars['Int']['input']>;
  newCapacity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  newRarity?: InputMaybe<Scalars['Int']['input']>;
  newRarity_gt?: InputMaybe<Scalars['Int']['input']>;
  newRarity_gte?: InputMaybe<Scalars['Int']['input']>;
  newRarity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  newRarity_lt?: InputMaybe<Scalars['Int']['input']>;
  newRarity_lte?: InputMaybe<Scalars['Int']['input']>;
  newRarity_not?: InputMaybe<Scalars['Int']['input']>;
  newRarity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  oldRarity?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_gt?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_gte?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  oldRarity_lt?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_lte?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_not?: InputMaybe<Scalars['Int']['input']>;
  oldRarity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  or?: InputMaybe<Array<InputMaybe<RelicUpgrade_Filter>>>;
  owner?: InputMaybe<Scalars['String']['input']>;
  owner_?: InputMaybe<Player_Filter>;
  owner_contains?: InputMaybe<Scalars['String']['input']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_gt?: InputMaybe<Scalars['String']['input']>;
  owner_gte?: InputMaybe<Scalars['String']['input']>;
  owner_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_lt?: InputMaybe<Scalars['String']['input']>;
  owner_lte?: InputMaybe<Scalars['String']['input']>;
  owner_not?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  relic?: InputMaybe<Scalars['String']['input']>;
  relic_?: InputMaybe<Relic_Filter>;
  relic_contains?: InputMaybe<Scalars['String']['input']>;
  relic_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  relic_ends_with?: InputMaybe<Scalars['String']['input']>;
  relic_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  relic_gt?: InputMaybe<Scalars['String']['input']>;
  relic_gte?: InputMaybe<Scalars['String']['input']>;
  relic_in?: InputMaybe<Array<Scalars['String']['input']>>;
  relic_lt?: InputMaybe<Scalars['String']['input']>;
  relic_lte?: InputMaybe<Scalars['String']['input']>;
  relic_not?: InputMaybe<Scalars['String']['input']>;
  relic_not_contains?: InputMaybe<Scalars['String']['input']>;
  relic_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  relic_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  relic_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  relic_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  relic_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  relic_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  relic_starts_with?: InputMaybe<Scalars['String']['input']>;
  relic_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type RelicUpgrade_OrderBy =
  | 'id'
  | 'newCapacity'
  | 'newRarity'
  | 'oldRarity'
  | 'owner'
  | 'owner__id'
  | 'relic'
  | 'relic__burnedAt'
  | 'relic__capacity'
  | 'relic__contractAddress'
  | 'relic__createdAt'
  | 'relic__id'
  | 'relic__isBurned'
  | 'relic__lastUpgradedAt'
  | 'relic__rarity'
  | 'relic__tokenId'
  | 'timestamp';

export type Relic_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Relic_Filter>>>;
  burnedAt?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  burnedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  burnedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  capacity?: InputMaybe<Scalars['Int']['input']>;
  capacity_gt?: InputMaybe<Scalars['Int']['input']>;
  capacity_gte?: InputMaybe<Scalars['Int']['input']>;
  capacity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  capacity_lt?: InputMaybe<Scalars['Int']['input']>;
  capacity_lte?: InputMaybe<Scalars['Int']['input']>;
  capacity_not?: InputMaybe<Scalars['Int']['input']>;
  capacity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  contractAddress?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_contains?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_gt?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_gte?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  contractAddress_lt?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_lte?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_not?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  contractAddress_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  createdAt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  isBurned?: InputMaybe<Scalars['Boolean']['input']>;
  isBurned_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isBurned_not?: InputMaybe<Scalars['Boolean']['input']>;
  isBurned_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  lastUpgradedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpgradedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpgradedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<Relic_Filter>>>;
  owner?: InputMaybe<Scalars['String']['input']>;
  owner_?: InputMaybe<Player_Filter>;
  owner_contains?: InputMaybe<Scalars['String']['input']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_gt?: InputMaybe<Scalars['String']['input']>;
  owner_gte?: InputMaybe<Scalars['String']['input']>;
  owner_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_lt?: InputMaybe<Scalars['String']['input']>;
  owner_lte?: InputMaybe<Scalars['String']['input']>;
  owner_not?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  rarity?: InputMaybe<Scalars['Int']['input']>;
  rarity_gt?: InputMaybe<Scalars['Int']['input']>;
  rarity_gte?: InputMaybe<Scalars['Int']['input']>;
  rarity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  rarity_lt?: InputMaybe<Scalars['Int']['input']>;
  rarity_lte?: InputMaybe<Scalars['Int']['input']>;
  rarity_not?: InputMaybe<Scalars['Int']['input']>;
  rarity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  tokenId?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_gte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  tokenId_lt?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_lte?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_not?: InputMaybe<Scalars['BigInt']['input']>;
  tokenId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  upgradeHistory_?: InputMaybe<RelicUpgrade_Filter>;
};

export type Relic_OrderBy =
  | 'burnedAt'
  | 'capacity'
  | 'contractAddress'
  | 'createdAt'
  | 'id'
  | 'isBurned'
  | 'lastUpgradedAt'
  | 'owner'
  | 'owner__id'
  | 'rarity'
  | 'tokenId'
  | 'upgradeHistory';

export type UpgradeAttempt = {
  __typename?: 'UpgradeAttempt';
  /**  V2Fixed new fields  */
  baseRarity: Scalars['Int']['output'];
  burnedTokenIds: Array<Scalars['BigInt']['output']>;
  fee: Scalars['BigInt']['output'];
  /**  使用 `txHash-logIndex` 作為唯一 ID  */
  id: Scalars['String']['output'];
  /**  是否成功  */
  isSuccess: Scalars['Boolean']['output'];
  /**  被銷毀的材料 ID 列表  */
  materialIds: Array<Scalars['String']['output']>;
  /**  被銷毀的材料實體列表 (英雄或聖物)  */
  materials: Array<Scalars['String']['output']>;
  mintedTokenIds: Array<Scalars['BigInt']['output']>;
  /**  新稀有度 (如果成功)  */
  newRarity?: Maybe<Scalars['Int']['output']>;
  outcome: Scalars['Int']['output'];
  /**  執行升級的玩家  */
  player: Player;
  /**  被升級的目標  */
  targetId: Scalars['String']['output'];
  /**  時間戳  */
  timestamp: Scalars['BigInt']['output'];
  totalVipBonus?: Maybe<Scalars['Int']['output']>;
  /**  升級類型 (hero/relic)  */
  type: Scalars['String']['output'];
  /**  V5 Optimized new fields  */
  vipLevel?: Maybe<Scalars['Int']['output']>;
};

export type UpgradeAttempt_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<UpgradeAttempt_Filter>>>;
  baseRarity?: InputMaybe<Scalars['Int']['input']>;
  baseRarity_gt?: InputMaybe<Scalars['Int']['input']>;
  baseRarity_gte?: InputMaybe<Scalars['Int']['input']>;
  baseRarity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  baseRarity_lt?: InputMaybe<Scalars['Int']['input']>;
  baseRarity_lte?: InputMaybe<Scalars['Int']['input']>;
  baseRarity_not?: InputMaybe<Scalars['Int']['input']>;
  baseRarity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  burnedTokenIds?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  burnedTokenIds_contains?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  burnedTokenIds_contains_nocase?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  burnedTokenIds_not?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  burnedTokenIds_not_contains?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  burnedTokenIds_not_contains_nocase?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  fee?: InputMaybe<Scalars['BigInt']['input']>;
  fee_gt?: InputMaybe<Scalars['BigInt']['input']>;
  fee_gte?: InputMaybe<Scalars['BigInt']['input']>;
  fee_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  fee_lt?: InputMaybe<Scalars['BigInt']['input']>;
  fee_lte?: InputMaybe<Scalars['BigInt']['input']>;
  fee_not?: InputMaybe<Scalars['BigInt']['input']>;
  fee_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  id?: InputMaybe<Scalars['String']['input']>;
  id_contains?: InputMaybe<Scalars['String']['input']>;
  id_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_gt?: InputMaybe<Scalars['String']['input']>;
  id_gte?: InputMaybe<Scalars['String']['input']>;
  id_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_lt?: InputMaybe<Scalars['String']['input']>;
  id_lte?: InputMaybe<Scalars['String']['input']>;
  id_not?: InputMaybe<Scalars['String']['input']>;
  id_not_contains?: InputMaybe<Scalars['String']['input']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  id_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id_starts_with?: InputMaybe<Scalars['String']['input']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  isSuccess?: InputMaybe<Scalars['Boolean']['input']>;
  isSuccess_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isSuccess_not?: InputMaybe<Scalars['Boolean']['input']>;
  isSuccess_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  materialIds?: InputMaybe<Array<Scalars['String']['input']>>;
  materialIds_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  materialIds_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  materialIds_not?: InputMaybe<Array<Scalars['String']['input']>>;
  materialIds_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  materialIds_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  materials?: InputMaybe<Array<Scalars['String']['input']>>;
  materials_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  materials_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  materials_not?: InputMaybe<Array<Scalars['String']['input']>>;
  materials_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  materials_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  mintedTokenIds?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  mintedTokenIds_contains?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  mintedTokenIds_contains_nocase?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  mintedTokenIds_not?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  mintedTokenIds_not_contains?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  mintedTokenIds_not_contains_nocase?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  newRarity?: InputMaybe<Scalars['Int']['input']>;
  newRarity_gt?: InputMaybe<Scalars['Int']['input']>;
  newRarity_gte?: InputMaybe<Scalars['Int']['input']>;
  newRarity_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  newRarity_lt?: InputMaybe<Scalars['Int']['input']>;
  newRarity_lte?: InputMaybe<Scalars['Int']['input']>;
  newRarity_not?: InputMaybe<Scalars['Int']['input']>;
  newRarity_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  or?: InputMaybe<Array<InputMaybe<UpgradeAttempt_Filter>>>;
  outcome?: InputMaybe<Scalars['Int']['input']>;
  outcome_gt?: InputMaybe<Scalars['Int']['input']>;
  outcome_gte?: InputMaybe<Scalars['Int']['input']>;
  outcome_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  outcome_lt?: InputMaybe<Scalars['Int']['input']>;
  outcome_lte?: InputMaybe<Scalars['Int']['input']>;
  outcome_not?: InputMaybe<Scalars['Int']['input']>;
  outcome_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  player?: InputMaybe<Scalars['String']['input']>;
  player_?: InputMaybe<Player_Filter>;
  player_contains?: InputMaybe<Scalars['String']['input']>;
  player_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  player_ends_with?: InputMaybe<Scalars['String']['input']>;
  player_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player_gt?: InputMaybe<Scalars['String']['input']>;
  player_gte?: InputMaybe<Scalars['String']['input']>;
  player_in?: InputMaybe<Array<Scalars['String']['input']>>;
  player_lt?: InputMaybe<Scalars['String']['input']>;
  player_lte?: InputMaybe<Scalars['String']['input']>;
  player_not?: InputMaybe<Scalars['String']['input']>;
  player_not_contains?: InputMaybe<Scalars['String']['input']>;
  player_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  player_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  player_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  player_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  player_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  player_starts_with?: InputMaybe<Scalars['String']['input']>;
  player_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  targetId?: InputMaybe<Scalars['String']['input']>;
  targetId_contains?: InputMaybe<Scalars['String']['input']>;
  targetId_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  targetId_ends_with?: InputMaybe<Scalars['String']['input']>;
  targetId_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  targetId_gt?: InputMaybe<Scalars['String']['input']>;
  targetId_gte?: InputMaybe<Scalars['String']['input']>;
  targetId_in?: InputMaybe<Array<Scalars['String']['input']>>;
  targetId_lt?: InputMaybe<Scalars['String']['input']>;
  targetId_lte?: InputMaybe<Scalars['String']['input']>;
  targetId_not?: InputMaybe<Scalars['String']['input']>;
  targetId_not_contains?: InputMaybe<Scalars['String']['input']>;
  targetId_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  targetId_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  targetId_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  targetId_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  targetId_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  targetId_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  targetId_starts_with?: InputMaybe<Scalars['String']['input']>;
  targetId_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  totalVipBonus?: InputMaybe<Scalars['Int']['input']>;
  totalVipBonus_gt?: InputMaybe<Scalars['Int']['input']>;
  totalVipBonus_gte?: InputMaybe<Scalars['Int']['input']>;
  totalVipBonus_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  totalVipBonus_lt?: InputMaybe<Scalars['Int']['input']>;
  totalVipBonus_lte?: InputMaybe<Scalars['Int']['input']>;
  totalVipBonus_not?: InputMaybe<Scalars['Int']['input']>;
  totalVipBonus_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  type?: InputMaybe<Scalars['String']['input']>;
  type_contains?: InputMaybe<Scalars['String']['input']>;
  type_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  type_ends_with?: InputMaybe<Scalars['String']['input']>;
  type_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  type_gt?: InputMaybe<Scalars['String']['input']>;
  type_gte?: InputMaybe<Scalars['String']['input']>;
  type_in?: InputMaybe<Array<Scalars['String']['input']>>;
  type_lt?: InputMaybe<Scalars['String']['input']>;
  type_lte?: InputMaybe<Scalars['String']['input']>;
  type_not?: InputMaybe<Scalars['String']['input']>;
  type_not_contains?: InputMaybe<Scalars['String']['input']>;
  type_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  type_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  type_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  type_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  type_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  type_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  type_starts_with?: InputMaybe<Scalars['String']['input']>;
  type_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  vipLevel?: InputMaybe<Scalars['Int']['input']>;
  vipLevel_gt?: InputMaybe<Scalars['Int']['input']>;
  vipLevel_gte?: InputMaybe<Scalars['Int']['input']>;
  vipLevel_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  vipLevel_lt?: InputMaybe<Scalars['Int']['input']>;
  vipLevel_lte?: InputMaybe<Scalars['Int']['input']>;
  vipLevel_not?: InputMaybe<Scalars['Int']['input']>;
  vipLevel_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type UpgradeAttempt_OrderBy =
  | 'baseRarity'
  | 'burnedTokenIds'
  | 'fee'
  | 'id'
  | 'isSuccess'
  | 'materialIds'
  | 'materials'
  | 'mintedTokenIds'
  | 'newRarity'
  | 'outcome'
  | 'player'
  | 'player__id'
  | 'targetId'
  | 'timestamp'
  | 'totalVipBonus'
  | 'type'
  | 'vipLevel';

export type Vip = {
  __typename?: 'VIP';
  /**  創建時間戳  */
  createdAt: Scalars['BigInt']['output'];
  /**  使用錢包地址作為 ID  */
  id: Scalars['Bytes']['output'];
  /**  是否正在解鎖中  */
  isUnlocking: Scalars['Boolean']['output'];
  /**  最後更新時間戳  */
  lastUpdatedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  擁有者  */
  owner: Player;
  /**  質押的 SoulShard 數量 (注意：VIP等級由前端直接從合約讀取)  */
  stakedAmount: Scalars['BigInt']['output'];
  /**  開始質押時間戳  */
  stakedAt: Scalars['BigInt']['output'];
  /**  請求解鎖的時間戳  */
  unlockRequestedAt?: Maybe<Scalars['BigInt']['output']>;
  /**  解鎖時間戳 (如果有冷卻期)  */
  unlockTime?: Maybe<Scalars['BigInt']['output']>;
};

export type Vip_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Vip_Filter>>>;
  createdAt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  id?: InputMaybe<Scalars['Bytes']['input']>;
  id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  id_not?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
  isUnlocking?: InputMaybe<Scalars['Boolean']['input']>;
  isUnlocking_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isUnlocking_not?: InputMaybe<Scalars['Boolean']['input']>;
  isUnlocking_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  lastUpdatedAt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  lastUpdatedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  lastUpdatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  or?: InputMaybe<Array<InputMaybe<Vip_Filter>>>;
  owner?: InputMaybe<Scalars['String']['input']>;
  owner_?: InputMaybe<Player_Filter>;
  owner_contains?: InputMaybe<Scalars['String']['input']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_gt?: InputMaybe<Scalars['String']['input']>;
  owner_gte?: InputMaybe<Scalars['String']['input']>;
  owner_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_lt?: InputMaybe<Scalars['String']['input']>;
  owner_lte?: InputMaybe<Scalars['String']['input']>;
  owner_not?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains?: InputMaybe<Scalars['String']['input']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with?: InputMaybe<Scalars['String']['input']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  stakedAmount?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAmount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAmount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAmount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  stakedAmount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAmount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAmount_not?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAmount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  stakedAt?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  stakedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  stakedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  unlockRequestedAt?: InputMaybe<Scalars['BigInt']['input']>;
  unlockRequestedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  unlockRequestedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  unlockRequestedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  unlockRequestedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  unlockRequestedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  unlockRequestedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  unlockRequestedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  unlockTime?: InputMaybe<Scalars['BigInt']['input']>;
  unlockTime_gt?: InputMaybe<Scalars['BigInt']['input']>;
  unlockTime_gte?: InputMaybe<Scalars['BigInt']['input']>;
  unlockTime_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  unlockTime_lt?: InputMaybe<Scalars['BigInt']['input']>;
  unlockTime_lte?: InputMaybe<Scalars['BigInt']['input']>;
  unlockTime_not?: InputMaybe<Scalars['BigInt']['input']>;
  unlockTime_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type Vip_OrderBy =
  | 'createdAt'
  | 'id'
  | 'isUnlocking'
  | 'lastUpdatedAt'
  | 'owner'
  | 'owner__id'
  | 'stakedAmount'
  | 'stakedAt'
  | 'unlockRequestedAt'
  | 'unlockTime';

export type _Block_ = {
  __typename?: '_Block_';
  /** The hash of the block */
  hash?: Maybe<Scalars['Bytes']['output']>;
  /** The block number */
  number: Scalars['Int']['output'];
  /** The hash of the parent block */
  parentHash?: Maybe<Scalars['Bytes']['output']>;
  /** Integer representation of the timestamp stored in blocks for the chain */
  timestamp?: Maybe<Scalars['Int']['output']>;
};

/** The type for the top-level _meta field */
export type _Meta_ = {
  __typename?: '_Meta_';
  /**
   * Information about a specific subgraph block. The hash of the block
   * will be null if the _meta field has a block constraint that asks for
   * a block number. It will be filled if the _meta field has no block constraint
   * and therefore asks for the latest  block
   *
   */
  block: _Block_;
  /** The deployment ID */
  deployment: Scalars['String']['output'];
  /** If `true`, the subgraph encountered indexing errors at some past block */
  hasIndexingErrors: Scalars['Boolean']['output'];
};

export type _SubgraphErrorPolicy_ =
  /** Data will be returned even if the subgraph has indexing errors */
  | 'allow'
  /** If the subgraph has indexing errors, data will be omitted. The default. */
  | 'deny';

export type GetPartyDetailsQueryVariables = Exact<{
  partyId: Scalars['ID']['input'];
}>;


export type GetPartyDetailsQuery = { __typename?: 'Query', party?: { __typename?: 'Party', id: string, tokenId: string, name: string, heroIds: Array<string>, relicIds: Array<string>, totalPower: string, totalCapacity: string, partyRarity: number, provisionsRemaining: number, unclaimedRewards: string, cooldownEndsAt: string, createdAt: string, lastUpdatedAt?: string | null, isBurned: boolean, owner: { __typename?: 'Player', id: string }, heroes: Array<{ __typename?: 'Hero', id: string, tokenId: string, rarity: number, power: string, owner: { __typename?: 'Player', id: string } }>, relics: Array<{ __typename?: 'Relic', id: string, tokenId: string, rarity: number, capacity: number, owner: { __typename?: 'Player', id: string } }>, expeditions?: Array<{ __typename?: 'Expedition', id: string, dungeonId: string, dungeonName: string, success: boolean, reward: string, expGained: string, timestamp: string, player: { __typename?: 'Player', id: string } }> | null } | null };

export type GetPlayerPartiesQueryVariables = Exact<{
  playerId: Scalars['ID']['input'];
}>;


export type GetPlayerPartiesQuery = { __typename?: 'Query', player?: { __typename?: 'Player', id: string, parties?: Array<{ __typename?: 'Party', id: string, tokenId: string, name: string, totalPower: string, heroIds: Array<string>, relicIds: Array<string>, heroes: Array<{ __typename?: 'Hero', id: string, tokenId: string }>, relics: Array<{ __typename?: 'Relic', id: string, tokenId: string }>, expeditions?: Array<{ __typename?: 'Expedition', id: string, success: boolean, timestamp: string, dungeonName: string }> | null }> | null } | null };

export type GetExpeditionHistoryQueryVariables = Exact<{
  playerId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetExpeditionHistoryQuery = { __typename?: 'Query', player?: { __typename?: 'Player', id: string, expeditions?: Array<{ __typename?: 'Expedition', id: string, dungeonId: string, dungeonName: string, dungeonPowerRequired: string, success: boolean, reward: string, expGained: string, timestamp: string, transactionHash: string, party: { __typename?: 'Party', id: string, tokenId: string, name: string, totalPower: string } }> | null } | null };

export type GetPlayerAnalyticsQueryVariables = Exact<{
  address: Scalars['ID']['input'];
}>;


export type GetPlayerAnalyticsQuery = { __typename?: 'Query', player?: { __typename?: 'Player', id: string, profile?: { __typename?: 'PlayerProfile', id: string, name: string, level: number, experience: string, successfulExpeditions: number, totalRewardsEarned: string } | null, parties?: Array<{ __typename?: 'Party', id: string, tokenId: string, name: string, totalPower: string }> | null, expeditions?: Array<{ __typename?: 'Expedition', id: string, success: boolean, reward: string, expGained: string, timestamp: string, dungeonId: string, dungeonName: string, party: { __typename?: 'Party', id: string, name: string } }> | null } | null };
