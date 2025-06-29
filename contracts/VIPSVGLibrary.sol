// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title VIPSVGLibrary
 * @notice 專門為 VIPStaking 合約生成鏈上 SVG 圖像的函式庫。
 * @dev 將視覺渲染邏輯與核心質押邏輯分離，提升了主合約的安全性與可讀性。
 */
library VIPSVGLibrary {
    using Strings for uint256;

    /**
     * @notice 函式庫的唯一入口點，生成完整的 tokenURI JSON 字串。
     */
    function buildTokenURI(uint256 _tokenId, uint8 _level) internal pure returns (string memory) {
        string memory svg = generateSVG(_tokenId, _level);
        
        string memory json = Base64.encode(
            bytes(
                abi.encodePacked(
                    '{"name":"Dungeon Delvers VIP Card #', _tokenId.toString(), '",',
                    '"description":"A special card that grants its holder unique privileges.",',
                    '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                    '"attributes": [',
                        '{"trait_type": "Success Rate Bonus", "value": ', _level.toString(), ', "display_type": "boost_percentage"},',
                        '{"trait_type": "Level", "value": ', _level.toString(), '}',
                    ']}'
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     * @notice 生成 SVG 圖像的核心函式。
     * @dev 包含了背景、動畫、文字樣式等所有視覺元素。
     */
    function generateSVG(uint256 _tokenId, uint8 _level) internal pure returns (string memory) {
        string memory bgColor1="#111111";
        string memory bgColor2="#2d2d2d";
        string memory goldColor="#ffd700";
        string memory platinumColor="#FFFFFF";

        return string(abi.encodePacked(
            '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">',
                _generateSVGDefs(platinumColor, goldColor),
                '<rect width="100%" height="100%" rx="20" fill="url(#bg-gradient-plat)"/>',
                '<rect width="100%" height="100%" rx="20" fill="url(#grid-plat)"/>',
                _generateStars(),
                '<rect x="30" y="40" width="60" height="40" rx="5" fill="#2c2c2c" />',
                '<rect x="35" y="45" width="50" height="30" rx="3" fill="#444" />',
                '<text x="50%" y="60" text-anchor="middle" class="title-plat">VIP PRIVILEGE</text>',
                '<g text-anchor="middle">',
                    '<text x="50%" y="220" class="level-plat">', _level.toString(), '</text>',
                    '<text x="50%" y="260" class="bonus-plat">SUCCESS RATE +', _level.toString(), '%</text>',
                '</g>',
                '<text x="35" y="370" class="card-id-plat">CARD # ', _tokenId.toString(), '</text>',
                '<text x="360" y="370" text-anchor="end" class="card-id-plat" font-weight="bold">Dungeon Delvers</text>',
                _generateCornerBrackets(platinumColor),
            '</svg>'
        ));
    }

    function _generateSVGDefs(string memory platinumColor, string memory goldColor) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<defs>',
                '<radialGradient id="bg-gradient-plat" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#2d2d2d" /><stop offset="100%" stop-color="#111111" /></radialGradient>',
                '<pattern id="grid-plat" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" stroke-width="0.2" opacity="0.05"/></pattern>',
                '<filter id="engrave-plat"><feDropShadow dx="1" dy="1" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.5"/></filter>',
                '<style>',
                    '@keyframes breathing-glow-plat { 0% { text-shadow: 0 0 10px ',platinumColor,'; } 50% { text-shadow: 0 0 20px ',platinumColor,', 0 0 30px ',platinumColor,'; } 100% { text-shadow: 0 0 10px ',platinumColor,'; } }',
                    '.title-plat { font-family: serif; font-size: 24px; fill: ',goldColor,'; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; filter: url(#engrave-plat);}',
                    '.level-plat { font-family: sans-serif; font-size: 96px; fill: ',platinumColor,'; font-weight: bold; animation: breathing-glow-plat 5s ease-in-out infinite; }',
                    '.bonus-plat { font-family: sans-serif; font-size: 20px; fill: ',platinumColor,'; opacity: 0.9; animation: breathing-glow-plat 5s ease-in-out infinite; animation-delay: -0.2s;}',
                    '.card-id-plat { font-family: monospace; font-size: 12px; fill: ',platinumColor,'; opacity: 0.5;}',
                '</style>',
            '</defs>'
        ));
    }

    function _generateStars() private pure returns (string memory) {
        return string(abi.encodePacked(
            '<g>',
                '<circle cx="50" cy="100" r="1.5" fill="white" opacity="0.1"><animate attributeName="opacity" values="0.1;0.3;0.1" dur="5s" repeatCount="indefinite" begin="0s"/></circle>',
                '<circle cx="320" cy="80" r="0.8" fill="white" opacity="0.2"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="7s" repeatCount="indefinite" begin="-2s"/></circle>',
                '<circle cx="150" cy="350" r="1.2" fill="white" opacity="0.1"><animate attributeName="opacity" values="0.1;0.4;0.1" dur="6s" repeatCount="indefinite" begin="-1s"/></circle>',
                '<circle cx="250" cy="280" r="1" fill="white" opacity="0.3"><animate attributeName="opacity" values="0.3;0.1;0.3" dur="8s" repeatCount="indefinite" begin="-3s"/></circle>',
            '</g>'
        ));
    }

    function _generateCornerBrackets(string memory platinumColor) private pure returns (string memory) {
         return string(abi.encodePacked(
            '<g stroke="',platinumColor,'" stroke-width="1.5" opacity="0.3">',
                '<path d="M 30 20 L 20 20 L 20 30" fill="none" />',
                '<path d="M 370 20 L 380 20 L 380 30" fill="none" />',
                '<path d="M 30 380 L 20 380 L 20 370" fill="none" />',
                '<path d="M 370 380 L 380 380 L 380 370" fill="none" />',
            '</g>'
        ));
    }
}