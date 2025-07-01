// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IHero Interface
 * @notice Hero 合約的外部接口，定義了其核心功能與數據結構。
 */
interface IHero {
    /**
     * @dev Hero NFT 的核心屬性，在鑄造時確定。
     */
    struct HeroData {
        uint8 rarity;
        uint256 power;
        uint8 heroClass;
    }

    /**
     * @notice 獲取一個英雄的所有數據。
     * @param tokenId 要查詢的英雄 Token ID。
     * @return data 包含英雄核心屬性的結構體。
     * @return expeditions 英雄的遠征總次數。
     */
    function getHero(uint256 tokenId) external view returns (HeroData memory data, uint256 expeditions);

    /**
     * @notice 增加一個英雄的遠征次數。
     * @dev 應由 Party 或 DungeonMaster 合約呼叫。
     * @param tokenId 要增加次數的英雄 Token ID。
     * @param amount 要增加的遠征次數。
     */
    function incrementExpeditions(uint256 tokenId, uint256 amount) external;

    // --- ERC721 標準函式 ---
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;

    // --- 祭壇互動函式 ---
    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external returns (uint256);
    function burnFromAltar(uint256 _tokenId) external;
}
