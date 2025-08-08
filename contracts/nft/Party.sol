// contracts/PartyV3.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/interfaces.sol";

contract PartyV3 is ERC721, Ownable, ReentrancyGuard, Pausable, ERC721Holder {
    using Strings for uint256;
    string public baseURI;
    string private _contractURI;

    // --- 狀態變數 ---
    IHero public heroContract;
    IRelic public relicContract;
    IDungeonCore public dungeonCoreContract;

    uint256 public platformFee = 0.001 ether;
    struct PartyComposition {
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
        uint8 partyRarity;
    }
    mapping(uint256 => PartyComposition) public partyCompositions;
    uint256 private _nextTokenId;
    
    // Direct power lookup mappings for DungeonMaster compatibility
    mapping(uint256 => uint256) public partyPowerDirect;
    mapping(uint256 => uint256) public partyCapacityDirect;

    // --- 事件 ---
    event PartyCreated(
        uint256 indexed partyId,
        address indexed owner,
        uint256[] heroIds,
        uint256[] relicIds,
        uint256 totalPower,
        uint256 totalCapacity,
        uint8 partyRarity
    );
    event PlatformFeeSet(uint256 newFee);
    event HeroContractSet(address indexed newAddress);
    event RelicContractSet(address indexed newAddress);
    event DungeonCoreSet(address indexed newAddress);
    event BaseURISet(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event OperatorApprovalSet(address indexed operator, bool approved);
    event PartyDisbanded(uint256 indexed partyId, address indexed owner);
    event PartyMemberChanged(uint256 indexed partyId, uint256[] heroIds, uint256[] relicIds);
    event PartyMemberAdded(uint256 indexed partyId, address indexed owner, uint256 indexed heroId);
    event PartyMemberRemoved(uint256 indexed partyId, address indexed owner, uint256 indexed heroId);

    // --- 建構函式 ---
    constructor(
        address initialOwner
    ) ERC721("Dungeon Delvers Party", "DDP") Ownable(initialOwner) {
        _nextTokenId = 1;
    }

    // 接收原生代幣的函式
    receive() external payable {}

    // --- 核心功能 ---
    function createParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        returns (uint256 partyId) 
    {
        require(msg.value >= platformFee, "Party: Platform fee not met");
        require(_relicIds.length > 0 && _relicIds.length <= 5, "Party: Invalid relic count");
        require(_heroIds.length <= 25, "Party: Too many heroes");
        require(address(heroContract) != address(0) && address(relicContract) != address(0), "Party: Contracts not set");

        uint256 totalPower = 0;
        uint256 totalCapacity = 0;
        
        // 驗證聖物並計算總容量
        for (uint i = 0; i < _relicIds.length; i++) {
            require(relicContract.ownerOf(_relicIds[i]) == msg.sender, "Party: You do not own all relics");
            (, uint8 capacity) = relicContract.getRelicProperties(_relicIds[i]);
            totalCapacity += capacity;
        }

        require(_heroIds.length <= totalCapacity, "Party: Too many heroes for capacity");
        
        // 驗證英雄並計算總戰力
        for (uint i = 0; i < _heroIds.length; i++) {
            require(heroContract.ownerOf(_heroIds[i]) == msg.sender, "Party: You do not own all heroes");
            (, uint256 power) = heroContract.getHeroProperties(_heroIds[i]);
            totalPower += power;
        }

        // 安全性升級：使用 safeTransferFrom 將 NFT 轉入本合約
        for (uint i = 0; i < _relicIds.length; i++) {
            relicContract.safeTransferFrom(msg.sender, address(this), _relicIds[i]);
        }
        for (uint i = 0; i < _heroIds.length; i++) {
            heroContract.safeTransferFrom(msg.sender, address(this), _heroIds[i]);
        }
        
        partyId = _nextTokenId;
        uint8 partyRarity = _calculatePartyRarity(totalCapacity);
        
        partyCompositions[partyId] = PartyComposition({
            heroIds: _heroIds,
            relicIds: _relicIds,
            totalPower: totalPower,
            totalCapacity: totalCapacity,
            partyRarity: partyRarity
        });
        
        // Store power/capacity in direct mappings for fast lookup
        partyPowerDirect[partyId] = totalPower;
        partyCapacityDirect[partyId] = totalCapacity;

        _safeMint(msg.sender, partyId);
        _nextTokenId++;
        
        emit PartyCreated(partyId, msg.sender, _heroIds, _relicIds, totalPower, totalCapacity, partyRarity);
    }
    
    // --- 元數據 URI ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        require(bytes(baseURI).length > 0, "Party: baseURI not set");
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }
    
    // --- Owner 管理函式 ---
    function setHeroContract(address _heroAddress) public onlyOwner {
        heroContract = IHero(_heroAddress);
        emit HeroContractSet(_heroAddress);
    }

    function setRelicContract(address _relicAddress) public onlyOwner {
        relicContract = IRelic(_relicAddress);
        emit RelicContractSet(_relicAddress);
    }

    function setDungeonCore(address _coreAddress) public onlyOwner {
        dungeonCoreContract = IDungeonCore(_coreAddress);
        emit DungeonCoreSet(_coreAddress);
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURISet(_newBaseURI);
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function setContractURI(string memory newContractURI) external onlyOwner {
        _contractURI = newContractURI;
        emit ContractURIUpdated(newContractURI);
    }

    function setOperatorApproval(address operator, bool approved) external onlyOwner {
        heroContract.setApprovalForAll(operator, approved);
        relicContract.setApprovalForAll(operator, approved);
        emit OperatorApprovalSet(operator, approved);
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }

    /**
     * @notice 提取合約中收取的平台費用 (BNB)
     */
    function withdrawNative() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Party: Native withdraw failed");
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        platformFee = _newFee;
        emit PlatformFeeSet(_newFee);
    }

    function _requireNotLocked(uint256 _partyId) internal view {
        if (address(dungeonCoreContract) != address(0)) {
            require(!dungeonCoreContract.isPartyLocked(_partyId), "Party: Locked in dungeon");
        }
    }
    
    function getPartyComposition(uint256 _partyId) external view returns (uint256 totalPower, uint256 totalCapacity) {
        ownerOf(_partyId);
        PartyComposition memory comp = partyCompositions[_partyId];
        return (comp.totalPower, comp.totalCapacity);
    }
    
    function getFullPartyComposition(uint256 _partyId) external view returns (PartyComposition memory) {
        ownerOf(_partyId);
        return partyCompositions[_partyId];
    }

    function _calculatePartyRarity(uint256 _capacity) private pure returns (uint8) {
        if (_capacity >= 20) return 5;
        if (_capacity >= 15) return 4;
        if (_capacity >= 10) return 3;
        if (_capacity >= 5) return 2;
        return 1;
    }
    
    // Fast power/capacity lookup functions for DungeonMaster
    function getPartyPowerQuick(uint256 _partyId) external view returns (uint256) {
        ownerOf(_partyId); // Check party exists
        return partyPowerDirect[_partyId];
    }
    
    function getPartyCapacityQuick(uint256 _partyId) external view returns (uint256) {
        ownerOf(_partyId); // Check party exists
        return partyCapacityDirect[_partyId];
    }
}