// Hero_NoVRF.sol SVG
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces.sol";

interface IDungeonSVGLibrary {
    // 定義一個通用的 HeroData 結構體，以便在介面中使用
    struct HeroData {
        uint8 rarity;
        uint256 power;
    }
    function buildHeroURI(HeroData memory _data, uint256 _tokenId) external pure returns (string memory);
}

contract Hero is ERC721, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    IDungeonSVGLibrary public dungeonSvgLibrary;
    address public ascensionAltarAddress;

    uint256 public dynamicSeed;
    uint256 private _nextTokenId;
    uint256 public mintPriceUSD = 2; // * 10**18
    uint256 public platformFee = 0.0003 ether; // 0.0003 BNB
    mapping(uint256 => IDungeonSVGLibrary.HeroData) public heroData;

    // --- 事件 ---
    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event DynamicSeedUpdated(uint256 newSeed);
    event ContractsSet(address indexed core, address indexed token);
    event DungeonSvgLibrarySet(address indexed newAddress);
    event AscensionAltarSet(address indexed newAddress);

    // --- 修飾符 ---
    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "Hero: Caller is not the Altar");
        _;
    }

    // --- 構造函數 ---
    constructor(
        address initialOwner
    ) ERC721("Dungeon Delvers Hero", "DDH") Ownable(initialOwner) {
        _nextTokenId = 1;
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
    }

    function mintFromWallet(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(msg.value >= platformFee * _quantity, "Hero: Platform fee not met");
        require(_quantity > 0, "Hero: Quantity must be > 0");
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);

        // Hero 合約自己處理 ERC20 轉帳
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);

        for (uint256 i = 0; i < _quantity; i++) {
            _generateAndMintOnChain(msg.sender, i);
        }
    }

    /**
     * @notice 使用玩家在遊戲內金庫 (PlayerVault) 的餘額來鑄造英雄。
     * @dev 這種方式是免稅的，鼓勵玩家複投。
     */
    function mintFromVault(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(msg.value >= platformFee * _quantity, "Hero: Platform fee not met");
        require(_quantity > 0, "Hero: Quantity must be > 0");
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);

        // 呼叫 PlayerVault 處理金庫扣款
        IPlayerVault(dungeonCore.playerVault()).spendForGame(
            msg.sender, 
            requiredAmount
        );
        
        for (uint256 i = 0; i < _quantity; i++) {
            _generateAndMintOnChain(msg.sender, i);
        }
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            dynamicSeed,          // 上一次的結果或管理員設定的種子
            block.prevrandao,     // 上一個區塊的隨機數 (PoS 下的 randomness)
            block.timestamp,      // 當前區塊時間戳
            msg.sender,           // 呼叫者地址
            _salt,                // 批次鑄造時的鹽值
            _nextTokenId          // 每個 Token 獨有的 ID
        )));
        
        (uint8 rarity, uint256 power) = _calculateAttributes(pseudoRandom, 0);

        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, pseudoRandom, uint256(power))));
        emit DynamicSeedUpdated(dynamicSeed);

        _mintHero(_to, rarity, power);
    }

    function _mintHero(address _to, uint8 _rarity, uint256 _power) private returns (uint256) {
        uint256 tokenId = _nextTokenId;
        heroData[tokenId] = IDungeonSVGLibrary.HeroData({
            rarity: _rarity,
            power: _power
        });
        _safeMint(_to, tokenId);
        _nextTokenId++;
        emit HeroMinted(tokenId, _to, _rarity, _power);
        return tokenId;
    }

    // --- 來自祭壇的鑄造/銷毀 ---

    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external onlyAltar returns (uint256) {
        ( , uint256 power) = _calculateAttributes(_randomNumber, _rarity);
        return _mintHero(_to, _rarity, power);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        _burn(_tokenId);
    }

    // --- 屬性計算 ---

    function _calculateAttributes(uint256 _randomNumber, uint8 _fixedRarity) private pure returns (uint8 rarity, uint256 power) {
        if (_fixedRarity > 0) {
            rarity = _fixedRarity;
        } else {
            uint256 rarityRoll = _randomNumber % 100;
            if (rarityRoll < 44) { rarity = 1; } 
            else if (rarityRoll < 79) { rarity = 2; } 
            else if (rarityRoll < 94) { rarity = 3; } 
            else if (rarityRoll < 99) { rarity = 4; } 
            else { rarity = 5; }
        }
        power = _generateHeroPowerByRarity(rarity, _randomNumber >> 8);
    }

    function _generateHeroPowerByRarity(uint8 _rarity, uint256 _randomNumber) private pure returns (uint256 power) {
        if (_rarity == 1) { power = 15 + (_randomNumber % (50 - 15 + 1)); }
        else if (_rarity == 2) { power = 50 + (_randomNumber % (100 - 50 + 1)); }
        else if (_rarity == 3) { power = 100 + (_randomNumber % (150 - 100 + 1)); }
        else if (_rarity == 4) { power = 150 + (_randomNumber % (200 - 150 + 1)); }
        else if (_rarity == 5) { power = 200 + (_randomNumber % (255 - 200 + 1)); }
        else { revert("Hero: Invalid rarity"); }
    }

    // --- 元數據 URI ---

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); 
        require(address(dungeonSvgLibrary) != address(0), "Hero: SVG Library not set");
        
        IDungeonSVGLibrary.HeroData memory data = heroData[tokenId];
        return dungeonSvgLibrary.buildHeroURI(data, tokenId);
    }

    // --- 外部查詢 ---

    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        require(address(dungeonCore) != address(0), "DungeonCore address not set");
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        return dungeonCore.getSoulShardAmountForUSD(totalCostUSD);
    }

    function getHeroProperties(uint256 tokenId) external view returns (IDungeonSVGLibrary.HeroData memory) {
        ownerOf(tokenId); 
        return heroData[tokenId];
    }

    // --- Owner 管理函式 ---

    function setDungeonCore(address _address) public onlyOwner {
        dungeonCore = IDungeonCore(_address);
        emit ContractsSet(_address, address(soulShardToken));
    }

    function setSoulShardToken(address _address) public onlyOwner {
        soulShardToken = IERC20(_address);
        emit ContractsSet(address(dungeonCore), _address);
    }

    function setDungeonSvgLibrary(address _address) public onlyOwner {
        dungeonSvgLibrary = IDungeonSVGLibrary(_address);
        emit DungeonSvgLibrarySet(_address);
    }

    function setAscensionAltarAddress(address _address) public onlyOwner {
        ascensionAltarAddress = _address;
        emit AscensionAltarSet(_address);
    }

    function setMintPriceUSD(uint256 _newPrice) external onlyOwner {
        mintPriceUSD = _newPrice;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.transfer(owner(), balance);
    }

    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Native withdraw failed");
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        platformFee = _newFee;
    }

    receive() external payable {}
}