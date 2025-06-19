// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DungeonDelversAssets
 * @dev 這是管理 Dungeon Delvers 遊戲所有 NFT 資產的 ERC-1155 合約。
 * 包括英雄、聖物以及未來可能的新資產。
 */
contract DungeonDelversAssets is ERC1155, Ownable {

    // --- Token ID 常數 ---
    // 這樣可以讓代碼更具可讀性，避免使用魔法數字。

    // 英雄 (ID: 1-10)
    uint256 public constant COMMON_HERO = 1;
    uint256 public constant UNCOMMON_HERO = 2;
    uint256 public constant RARE_HERO = 3;
    uint256 public constant EPIC_HERO = 4;
    uint256 public constant LEGENDARY_HERO = 5;

    // 聖物 (ID: 11-20)
    uint256 public constant COMMON_RELIC = 11;
    uint256 public constant UNCOMMON_RELIC = 12;
    uint256 public constant RARE_RELIC = 13;
    uint256 public constant EPIC_RELIC = 14;
    uint256 public constant LEGENDARY_RELIC = 15;
    
    // 遊戲貨幣 (如果也想用此合約管理)
    uint256 public constant SOUL_SHARD = 100;

    /**
     * @dev 合約建構子.
     * @param _initialOwner 合約的擁有者地址.
     * @param _uri NFT 元數據 (Metadata) 的基礎 URI.
     * 我們將所有 NFT 的屬性 (圖片, 名稱, 能力) 存儲在 IPFS 上。
     * OpenZeppelin 的標準會自動將 token ID 附加到這個 URI 後面。
     * 例如，ID 為 1 的 NFT，其元數據 URI 會是: "ipfs://YourCID/{id}.json" -> "ipfs://YourCID/1.json"
     */
    constructor(address _initialOwner, string memory _uri) ERC1155(_uri) Ownable(_initialOwner) {
        
    }
    
    /**
     * @dev 讓擁有者可以鑄造任何類型的資產。
     * 這是內部管理用的，例如預先鑄造一批 NFT 用於空投或獎勵。
     * @param to 接收者的地址
     * @param id 要鑄造的 Token ID (例如 COMMON_HERO)
     * @param amount 鑄造的數量
     * @param data 額外數據 (通常留空)
     */
    function mint(address to, uint256 id, uint256 amount, bytes memory data) public onlyOwner {
        _mint(to, id, amount, data);
    }
    
    /**
     * @dev 讓擁有者可以一次鑄造多種類型的資產。
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @dev 玩家調用的公開鑄造英雄函數。
     * `payable` 關鍵字允許此函數接收以太幣。
     * 這裡的邏輯非常簡化，真實應用中會複雜得多。
     */
    function mintHero() public payable {
        // 這裡應該加入遊戲代幣 ($SoulShard) 的邏輯，但我們先用 ETH 作為範例
        uint256 mintPrice = 0.01 ether;
        require(msg.value >= mintPrice, "Not enough ETH sent");

        // 隨機數生成在鏈上是個複雜且需要謹慎處理的問題。
        // 為了安全，通常會使用 Chainlink VRF (可驗證隨機函數)。
        // 這裡我們只做一個非常基礎的、不安全的偽隨機範例。
        // !!請勿在生產環境中使用下面的隨機邏輯!!
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.difficulty))) % 100;
        
        uint256 heroIdToMint;

        if (randomNumber < 44) { // 44%
            heroIdToMint = COMMON_HERO;
        } else if (randomNumber < 79) { // 35%
            heroIdToMint = UNCOMMON_HERO;
        } else if (randomNumber < 94) { // 15%
            heroIdToMint = RARE_HERO;
        } else if (randomNumber < 99) { // 5%
            heroIdToMint = EPIC_HERO;
        } else { // 1%
            heroIdToMint = LEGENDARY_HERO;
        }

        // 為調用此函數的玩家鑄造一個隨機決定的英雄
        _mint(msg.sender, heroIdToMint, 1, "");
    }
    
    /**
     * @dev 更新元數據的基礎 URI (只有擁有者可以)。
     */
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }
}
