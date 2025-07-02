// PlayerProfile
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ProfileSVGLibrary.sol";

/**
 * @title PlayerProfile
 * @notice 這是一個靈魂綁定代幣 (SBT)，用於代表玩家在 Dungeon Delvers 中的個人檔案與成就。
 * @dev 此合約已將 SVG 生成和計算邏輯完全分離至 ProfileSVGLibrary，以解決堆疊過深的問題。
 */
contract PlayerProfile is ERC721, Ownable {

    mapping(uint256 => uint256) public playerExperience;
    mapping(address => uint256) public profileTokenOf;
    address public dungeonCoreAddress;
    uint256 private _nextTokenId;

    event ProfileCreated(address indexed player, uint256 indexed tokenId);
    event ExperienceAdded(uint256 indexed tokenId, uint256 amount, uint256 newTotalExperience);
    event DungeonCoreAddressUpdated(address indexed newAddress);

    modifier onlyDungeonCore() {
        require(msg.sender == dungeonCoreAddress, "Caller is not the authorized DungeonCore contract");
        _;
    }

    constructor(address initialOwner) ERC721("Dungeon Delvers Profile", "DDP") Ownable(initialOwner) {
        _nextTokenId = 1;
    }

    function mintProfile(address _player) external onlyDungeonCore returns (uint256) {
        require(profileTokenOf[_player] == 0, "PlayerProfile: Profile already exists");
        uint256 tokenId = _nextTokenId++;
        _safeMint(_player, tokenId);
        profileTokenOf[_player] = tokenId;
        playerExperience[tokenId] = 0;
        emit ProfileCreated(_player, tokenId);
        return tokenId;
    }

    function addExperience(address _player, uint256 _amount) external onlyDungeonCore {
        uint256 tokenId = profileTokenOf[_player];
        require(tokenId != 0, "PlayerProfile: Player does not have a profile");
        playerExperience[tokenId] += _amount;
        emit ExperienceAdded(tokenId, _amount, playerExperience[tokenId]);
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        ownerOf(_tokenId); 
        uint256 exp = playerExperience[_tokenId];
        return ProfileSVGLibrary.buildTokenURI(_tokenId, exp);
    }

    function setDungeonCoreAddress(address _address) public onlyOwner {
        dungeonCoreAddress = _address;
        emit DungeonCoreAddressUpdated(_address);
    }
    
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
