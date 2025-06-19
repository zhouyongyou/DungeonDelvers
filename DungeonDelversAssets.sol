// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DungeonDelversAssets
 * @dev V2.3: 更新了英雄和聖物的預設鑄造價格。
 */
contract DungeonDelversAssets is ERC1155, Ownable {

    // --- Token ID 常數 ---
    uint256 public constant COMMON_HERO = 1;
    uint256 public constant UNCOMMON_HERO = 2;
    uint256 public constant RARE_HERO = 3;
    uint256 public constant EPIC_HERO = 4;
    uint256 public constant LEGENDARY_HERO = 5;

    uint256 public constant COMMON_RELIC = 11;
    uint256 public constant UNCOMMON_RELIC = 12;
    uint256 public constant RARE_RELIC = 13;
    uint256 public constant EPIC_RELIC = 14;
    uint256 public constant LEGENDARY_RELIC = 15;

    // --- 狀態變數 ---
    IERC20 public soulShardToken;

    uint256 public heroMintPrice = 1900 * 10**18; // 1900 $SoulShard
    uint256 public relicMintPrice = 9000 * 10**18; // 9000 $SoulShard

    // --- 事件 ---
    event MintPriceUpdated(uint256 newHeroPrice, uint256 newRelicPrice);
    event TokensWithdrawn(address indexed to, uint256 amount);

    /**
     * @dev 建構子
     * @param _initialOwner 合約的擁有者
     * @param _uri NFT 元數據的基礎 URI
     * @param _soulShardTokenAddress 您在發射台上創建的 $SoulShard 代幣地址
     */
    constructor(
        address _initialOwner,
        string memory _uri,
        address _soulShardTokenAddress
    ) ERC1155(_uri) Ownable(_initialOwner) {
        require(_soulShardTokenAddress != address(0), "Invalid token address");
        soulShardToken = IERC20(_soulShardTokenAddress);
    }

    /**
     * @dev 玩家調用以鑄造一個隨機英雄。
     */
    function mintHero() public {
        soulShardToken.transferFrom(msg.sender, address(this), heroMintPrice);

        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.difficulty))) % 100;
        
        uint256 heroIdToMint;
        if (randomNumber < 44) { heroIdToMint = COMMON_HERO; }
        else if (randomNumber < 79) { heroIdToMint = UNCOMMON_HERO; }
        else if (randomNumber < 94) { heroIdToMint = RARE_HERO; }
        else if (randomNumber < 99) { heroIdToMint = EPIC_HERO; }
        else { heroIdToMint = LEGENDARY_HERO; }

        _mint(msg.sender, heroIdToMint, 1, "");
    }
    
    /**
     * @dev 玩家調用以鑄造一個隨機聖物。
     */
    function mintRelic() public {
        soulShardToken.transferFrom(msg.sender, address(this), relicMintPrice);

        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 100;

        uint256 relicIdToMint;
        if (randomNumber < 44) { relicIdToMint = COMMON_RELIC; }
        else if (randomNumber < 79) { relicIdToMint = UNCOMMON_RELIC; }
        else if (randomNumber < 94) { relicIdToMint = RARE_RELIC; }
        else if (randomNumber < 99) { relicIdToMint = EPIC_RELIC; }
        else { relicIdToMint = LEGENDARY_RELIC; }

        _mint(msg.sender, relicIdToMint, 1, "");
    }

    // --- 擁有者管理功能 ---
    function setMintPrice(uint256 _newHeroPrice, uint256 _newRelicPrice) public onlyOwner {
        heroMintPrice = _newHeroPrice;
        relicMintPrice = _newRelicPrice;
        emit MintPriceUpdated(_newHeroPrice, _newRelicPrice);
    }
    
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function withdrawTokens(address _to, uint256 _amount) public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(_amount <= balance, "Withdraw amount exceeds balance");
        soulShardToken.transfer(_to, _amount);
        emit TokensWithdrawn(_to, _amount);
    }

    // --- 唯讀功能 ---
    function uri(uint256 _id) public view override returns (string memory) {
        return super.uri(_id);
    }
}
