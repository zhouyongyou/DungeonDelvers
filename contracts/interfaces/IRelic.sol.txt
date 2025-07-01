// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRelic Interface
 * @notice Relic 合約的外部接口，定義了其核心功能與數據結構。
 */
interface IRelic {
    /**
     * @dev Relic NFT 的核心屬性。
     */
    struct RelicData {
        uint8 rarity;
        uint8 capacity;
        uint8 element;
    }

    /**
     * @notice 獲取一個聖物的所有數據。
     * @param tokenId 要查詢的聖物 Token ID。
     * @return data 包含聖物核心屬性的結構體。
     * @return expeditions 聖物的遠征總次數。
     */
    function getRelic(uint256 tokenId) external view returns (RelicData memory data, uint256 expeditions);

    /**
     * @notice 增加一個聖物的遠征次數。
     * @dev 應由 Party 或 DungeonMaster 合約呼叫。
     * @param tokenId 要增加次數的聖物 Token ID。
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
