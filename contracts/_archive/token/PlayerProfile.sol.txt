// =================================================================
// 檔案: contracts/token/PlayerProfile.sol (v5 版本)
// =================================================================
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IPlayerProfile.sol";
import "../interfaces/IDungeonCore.sol";
import "../libraries/ProfileSVGLibrary.sol";

contract PlayerProfile is IPlayerProfile, ERC721, Ownable {
    IDungeonCore public dungeonCore;
    // ★ 核心修正 1：將 Counters.Counter 換成原生的 uint256
    uint256 private _nextTokenId;
    mapping(address => Profile) public profiles;
    mapping(address => uint256) public profileTokenOf;

    event ProfileCreated(address indexed player, uint256 indexed tokenId, string name);
    event ProfileNameUpdated(address indexed player, string newName);
    event ExperienceAdded(address indexed player, uint256 amount, uint256 newTotalExperience);
    event DungeonCoreUpdated(address indexed newAddress);

    modifier onlyAuthorized() {
        require(msg.sender == dungeonCore.dungeonMaster(), "Profile: Caller is not the DungeonMaster");
        _;
    }

    // 【v5 修正】更新 Ownable 建構函式
    constructor(
        address _dungeonCoreAddress,
        address initialOwner
    ) ERC721("Dungeon Delvers Profile", "DDPF") Ownable(initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _nextTokenId++;
    }

    function addExperience(address _player, uint256 _amount) external override onlyAuthorized {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) {
            tokenId = _createProfileForPlayer(_player, "Delver");
        }
        profiles[_player].experience += _amount;
        emit ExperienceAdded(_player, _amount, profiles[_player].experience);
    }
    
    function setProfileName(string calldata _newName) external override {
        require(profileTokenOf[msg.sender] != 0, "Profile: You don't have a profile yet.");
        require(bytes(_newName).length > 0 && bytes(_newName).length < 32, "Profile: Invalid name length");
        profiles[msg.sender].name = _newName;
        emit ProfileNameUpdated(msg.sender, _newName);
    }

    function _createProfileForPlayer(address _player, string memory _name) private returns (uint256 newTokenId) {
        newTokenId = _nextTokenId;
        _nextTokenId++;
        _safeMint(_player, newTokenId);
        profileTokenOf[_player] = newTokenId;
        profiles[_player] = Profile({
            name: _name,
            createdAt: block.timestamp,
            experience: 0
        });
        emit ProfileCreated(_player, newTokenId, _name);
    }

    function getProfile(address _player) external view override returns (Profile memory) {
        require(profileTokenOf[_player] != 0, "Profile: Profile does not exist");
        return profiles[_player];
    }
    
    function tokenURI(address player) public view override returns (string memory) {
        uint256 tokenId = profileTokenOf[player];
        require(tokenId != 0, "Profile: Profile does not exist");
        Profile memory profile = profiles[player];
        return ProfileSVGLibrary.buildTokenURI(tokenId, profile.experience);
    }

    function setDungeonCore(address _address) public onlyOwner {
        require(_address != address(0), "Profile: Zero address");
        dungeonCore = IDungeonCore(_address);
        emit DungeonCoreUpdated(_address);
    }
    
    // 【v5 修正】_update 函式在 v5 中是 virtual 的，覆寫時不需再加 virtual
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        return super._update(to, tokenId, auth);
    }
}