// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHero {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getHeroProperties(uint256 tokenId) external view returns (uint8 rarity, uint256 power);
    function mintFromAltar(address _to, uint8 _rarity, uint256 _power) external;
    function burnFromAltar(uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
}