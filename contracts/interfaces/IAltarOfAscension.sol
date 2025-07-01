// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAltarOfAscension Interface
 * @notice 升階祭壇的外部接口。
 */
interface IAltarOfAscension {
    /**
     * @dev 升階配方的數據結構。
     */
    struct Recipe {
        uint8 requiredRarity; // 需求材料的稀有度
        uint8 requiredCount;  // 需求材料的數量
        uint8 outputRarity;   // 產出成品的稀有度
    }

    /**
     * @notice 執行英雄升階。
     * @param _tokenIds 用於升階的英雄 Token ID 列表。
     */
    function ascendHero(uint256[] calldata _tokenIds) external;

    /**
     * @notice 獲取指定稀有度英雄的升階配方。
     */
    function getAscensionRecipe(uint8 _rarity) external view returns (Recipe memory);
}
