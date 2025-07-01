// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRelic Interface
 * @notice Relic 合約的外部接口，定義了其核心功能與數據結構。
 * @dev v3: 新增了 generation 屬性，為未來的「傳奇聖物」系統預留。
 */
interface IRelic {
    struct RelicData {
        uint8 rarity;
        uint8 capacity;
        uint8 element;
        uint256 generation; // 1 = 普通聖物, 2+ = 傳奇聖物等
    }

    function getRelic(uint256 tokenId) external view returns (RelicData memory data, uint256 expeditions);
    function incrementExpeditions(uint256 tokenId, uint256 amount) external;
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external returns (uint256);
    function burnFromAltar(uint256 _tokenId) external;
}
