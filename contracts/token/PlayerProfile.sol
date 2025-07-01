// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "../interfaces/IPlayerProfile.sol";
import "../interfaces/IDungeonCore.sol";
import "../libraries/ProfileSVGLibrary.sol";

/**
 * @title PlayerProfile (玩家檔案 SBT - 最終完整版)
 * @author Your Team Name
 * @notice 一個靈魂綁定代幣 (SBT)，用於代表玩家檔案，並將 SVG 生成邏輯分離至函式庫。
 */
contract PlayerProfile is IPlayerProfile, ERC721, Ownable {
    using Strings for uint256;

    IDungeonCore public dungeonCore;
    mapping(address => Profile) public profiles;
    mapping(address => uint256) public profileTokenOf;
    Counters.Counter private _nextTokenId;

    event ProfileCreated(address indexed player, uint256 indexed tokenId, string name);
    event ExperienceAdded(address indexed player, uint256 amount, uint256 newTotalExperience);
    event DungeonCoreUpdated(address indexed newAddress);

    modifier onlyAuthorized() {
        require(msg.sender == dungeonCore.dungeonMaster(), "Profile: Caller is not the DungeonMaster");
        _;
    }

    constructor(
        address _dungeonCoreAddress,
        address initialOwner
    ) ERC721("Dungeon Delvers Profile", "DDPF") Ownable(initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _nextTokenId.increment();
    }

    function addExperience(address _player, uint256 _amount) external override onlyAuthorized {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) {
            // 如果玩家還沒有檔案，我們不能直接為他創建，因為需要玩家自己提供暱稱。
            // 這個邏輯應該由一個 createProfile 函式處理。
            // 暫時先假設檔案已存在。
            revert("Profile: Profile does not exist for this player.");
        }
        profiles[_player].experience += _amount;
        emit ExperienceAdded(_player, _amount, profiles[_player].experience);
    }
    
    function createProfile(string calldata _name) external {
        require(profileTokenOf[msg.sender] == 0, "Profile: Profile already exists");
        require(bytes(_name).length > 0 && bytes(_name).length < 32, "Profile: Invalid name length");

        uint256 tokenId = _nextTokenId.current();
        _nextTokenId.increment();

        _safeMint(msg.sender, tokenId);
        profileTokenOf[msg.sender] = tokenId;
        profiles[msg.sender] = Profile({
            name: _name,
            createdAt: block.timestamp,
            experience: 0
        });
        emit ProfileCreated(msg.sender, tokenId, _name);
    }

    function getProfile(address _player) external view override returns (Profile memory) {
        require(profileTokenOf[_player] != 0, "Profile: Profile does not exist");
        return profiles[_player];
    }
    
    function tokenURI(address player) public view override returns (string memory) {
        uint256 tokenId = profileTokenOf[player];
        require(tokenId != 0, "Profile: Profile does not exist");
        
        Profile memory profile = profiles[player];
        string memory svg = ProfileSVGLibrary.generateProfileSVG(
            player,
            profile.name,
            profile.experience,
            profile.createdAt 
        );

        string memory json = Base64.encode(
            bytes(string(abi.encodePacked(
                '{"name": "', profile.name, '",',
                '"description": "A brave delver of the dungeons. This card represents their identity.",',
                '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
            )))
        );
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function setDungeonCore(address _address) public onlyOwner {
        require(_address != address(0), "Profile: Zero address");
        dungeonCore = IDungeonCore(_address);
        emit DungeonCoreUpdated(_address);
    }
    
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        return super._update(to, tokenId, auth);
    }
}
