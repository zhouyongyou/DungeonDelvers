// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAltarOfAscension Interface
 * @notice 升階祭壇的外部接口。
 * @dev 此為與 AltarOfAscension.sol (終極完整版) 完全匹配的接口文件。
 */
interface IAltarOfAscension {
    /**
     * @dev 升階配方的數據結構，定義了合成所需的材料、費用和各種成功機率。
     */
    struct Recipe {
        uint8 requiredRarity;     // 需求材料的稀有度
        uint8 requiredCount;      // 需求材料的數量
        uint256 nativeFee;        // 需要支付的原生代幣費用 (例如 ETH)
        uint8 greatSuccessChance; // 大成功機率 (0-99)
        uint8 successChance;      // 成功機率 (0-99)
        uint8 partialFailChance;  // 部分失敗機率 (0-99)
    }

    /**
     * @notice 獲取指定稀有度 NFT 的升階配方。
     * @param _rarity 要查詢的材料稀有度。
     * @return The recipe for the given rarity.
     */
    function getAscensionRecipe(uint8 _rarity) external view returns (Recipe memory);

    /**
     * @notice 玩家提交 NFT 進行升階。
     * @param _tokenContract 要升階的 NFT 合約地址 (Hero 或 Relic)。
     * @param _tokenIds 用於升階的 NFT Token ID 列表。
     */
    function upgradeNFTs(address _tokenContract, uint256[] calldata _tokenIds) external payable;
}
