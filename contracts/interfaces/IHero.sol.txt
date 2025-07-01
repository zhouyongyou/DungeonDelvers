// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IHero Interface
 * @notice Hero 合約的外部接口，定義了其核心功能與數據結構。
 * @dev v4: 移除了 safeTransferFrom 的聲明，以匹配 OpenZeppelin v5.x 的設計。
 */
interface IHero {
    struct HeroData {
        uint8 rarity;
        uint256 power;
        uint8 heroClass;
        uint256 generation; // 1 = 普通英雄, 2+ = 傳奇英傑等
    }

    function getHero(uint256 tokenId) external view returns (HeroData memory data, uint256 expeditions);
    function incrementExpeditions(uint256 tokenId, uint256 amount) external;
    function ownerOf(uint256 tokenId) external view returns (address owner);
    
    // ★ 核心修正：移除 safeTransferFrom 的聲明。
    // 外部合約應使用標準的 ERC721 接口來呼叫此函式。
    // function safeTransferFrom(address from, address to, uint256 tokenId) external;

    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external returns (uint256);
    function burnFromAltar(uint256 _tokenId) external;
}
