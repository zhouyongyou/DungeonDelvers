// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRelic {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getRelicProperties(uint256 tokenId) external view returns (uint8 rarity, uint8 capacity);
    function mintFromAltar(address _to, uint8 _rarity, uint8 _capacity) external;
    function burnFromAltar(uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
}