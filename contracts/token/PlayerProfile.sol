// contracts/token/PlayerProfile.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../interfaces/IPlayerProfile.sol";
import "../interfaces/IDungeonCore.sol";
import "../libraries/ProfileSVGLibrary.sol";

/**
 * @title PlayerProfile (玩家檔案 SBT - 修正版)
 * @author Z
 * @notice 一個靈魂綁定代幣 (SBT)，用於代表玩家檔案。
 * @dev 此版本實現了檔案自動創建、暱稱修改，並修復了 SVG 函式庫的呼叫錯誤。
 */
contract PlayerProfile is IPlayerProfile, ERC721, Ownable {
    using Counters for Counters.Counter;

    IDungeonCore public dungeonCore;
    mapping(address => Profile) public profiles;
    mapping(address => uint256) public profileTokenOf;
    Counters.Counter private _nextTokenId;

    event ProfileCreated(address indexed player, uint256 indexed tokenId, string name);
    event ProfileNameUpdated(address indexed player, string newName);
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

    /**
     * @notice 為玩家增加經驗值。如果玩家沒有個人檔案，會自動創建一個。
     * @dev 只能由授權的 DungeonMaster 合約呼叫。
     * @param _player 接收經驗值的玩家地址。
     * @param _amount 要增加的經驗值數量。
     */
    function addExperience(address _player, uint256 _amount) external override onlyAuthorized {
        uint256 tokenId = profileTokenOf[_player];
        
        // 如果玩家檔案不存在，則自動創建一個預設檔案
        if (tokenId == 0) {
            tokenId = _createProfileForPlayer(_player, "Delver");
        }

        profiles[_player].experience += _amount;
        emit ExperienceAdded(_player, _amount, profiles[_player].experience);
    }
    
    /**
     * @notice 讓玩家可以設定或更新自己的暱稱。
     * @param _newName 玩家想要設定的新暱稱。
     */
    function setProfileName(string calldata _newName) external override {
        require(profileTokenOf[msg.sender] != 0, "Profile: You don't have a profile yet.");
        require(bytes(_newName).length > 0 && bytes(_newName).length < 32, "Profile: Invalid name length");
        profiles[msg.sender].name = _newName;
        emit ProfileNameUpdated(msg.sender, _newName);
    }

    /**
     * @notice 內部函式，用於創建一個新的玩家檔案 SBT。
     * @param _player 玩家地址。
     * @param _name 初始名稱。
     * @return newTokenId 新創建的 Token ID。
     */
    function _createProfileForPlayer(address _player, string memory _name) private returns (uint256 newTokenId) {
        newTokenId = _nextTokenId.current();
        _nextTokenId.increment();

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
    
    /**
     * @notice 產生指定玩家檔案的元數據 URI。
     * @dev 【修正】修正了對函式庫的呼叫，從 generateProfileSVG 改為 buildTokenURI。
     */
    function tokenURI(address player) public view override returns (string memory) {
        uint256 tokenId = profileTokenOf[player];
        require(tokenId != 0, "Profile: Profile does not exist");
        
        Profile memory profile = profiles[player];

        return ProfileSVGLibrary.buildTokenURI(
            tokenId,
            profile.experience
        );
    }

    function setDungeonCore(address _address) public onlyOwner {
        require(_address != address(0), "Profile: Zero address");
        dungeonCore = IDungeonCore(_address);
        emit DungeonCoreUpdated(_address);
    }
    
    // 覆寫 _update 函式，確保代幣不可轉讓 (靈魂綁定)
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

}
