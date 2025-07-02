// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 【修正】將共享的結構體定義在介面檔案中
struct Recipe {
    uint8 requiredRarity;
    uint8 requiredCount;
    uint256 nativeFee;
    uint8 greatSuccessChance;
    uint8 successChance;
    uint8 partialFailChance;
}

struct UpgradeRequest {
    address player;
    address tokenContract;
    uint8 baseRarity;
}

interface IAltarOfAscension {
    function upgradeNFTs(address _tokenContract, uint256[] calldata _tokenIds) external payable;
    function getAscensionRecipe(uint8 _rarity) external view returns (Recipe memory);
}
