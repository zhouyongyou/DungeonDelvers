// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/ProfileSVGLibrary.sol";
import "../interfaces/IDungeonMaster.sol";

contract PlayerProfile is ERC721, Ownable {
    IDungeonMaster public dungeonMaster;

    uint256 private s_tokenCounter;
    mapping(address => uint256) public profileTokenOf;
    mapping(uint256 => uint256) public experiencePoints;
    
    event ProfileCreated(address indexed player, uint256 indexed tokenId);
    event ExperienceAdded(uint256 indexed tokenId, uint256 amount, uint256 newTotal);
    event DungeonMasterAddressUpdated(address indexed newAddress);

    constructor(address _initialOwner) ERC721("Dungeon Delvers Profile", "DDPF") Ownable(_initialOwner) {
    	s_tokenCounter = 1;
    }

    modifier onlyDungeonMaster() {
        require(msg.sender == address(dungeonMaster), "Profile: Caller is not DungeonMaster");
        _;
    }

    function addExperience(address _player, uint256 _amount) external onlyDungeonMaster {
        uint256 tokenId = profileTokenOf[_player];
        require(tokenId != 0, "Profile: Player does not have a profile");
        experiencePoints[tokenId] += _amount;
        emit ExperienceAdded(tokenId, _amount, experiencePoints[tokenId]);
    }

    function mintProfile(address _player) external onlyDungeonMaster returns (uint256) {
        require(profileTokenOf[_player] == 0, "Profile: Already has a profile");
        uint256 newTokenId = ++s_tokenCounter;
        profileTokenOf[_player] = newTokenId;
        _safeMint(_player, newTokenId);
        emit ProfileCreated(_player, newTokenId);
        return newTokenId;
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_exists(_tokenId), "URI query for nonexistent token");
        uint256 exp = experiencePoints[_tokenId];
        return ProfileSVGLibrary.buildTokenURI(_tokenId, exp);
    }
    
    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize) internal pure override {
        require(from == address(0), "PlayerProfile: Soul-bound, cannot be transferred");
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }
    
    function setDungeonMasterAddress(address _newAddress) external onlyOwner {
        dungeonMaster = IDungeonMaster(_newAddress);
        emit DungeonMasterAddressUpdated(_newAddress);
    }
    
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        return super._update(to, tokenId, auth);
    }
}
