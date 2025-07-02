// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title VIPSVGLibrary
 * @author Your Team Name
 * @notice 專門用於生成動態 VIP 卡 SVG 的函式庫 (最終版)。
 * @dev 融合了復古風格與動態進度條，將視覺與邏輯分離。
 */
library VIPSVGLibrary {
    using Strings for uint256;

    // 定義從主合約傳入的數據結構，讓呼叫更清晰
    struct VIPCardData {
        uint256 tokenId;
        uint256 level;
        uint256 stakedValueUSD;
        uint256 nextLevelRequirementUSD;
        uint256 currentLevelRequirementUSD;
    }

    /**
     * @notice 函式庫的唯一入口點，負責生成完整的 tokenURI。
     */
    function buildTokenURI(VIPCardData memory _data) internal pure returns (string memory) {
        string memory svg = generateSVG(_data);
        
        string memory json = Base64.encode(
            bytes(
                abi.encodePacked(
                    '{"name":"Dungeon Delvers VIP Card #', _data.tokenId.toString(), '",',
                    '"description":"A soul-bound VIP card that provides in-game bonuses based on the staked value.",',
                    '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                    '"attributes": [',
                        '{"trait_type": "VIP Level", "value": ', _data.level.toString(), '},',
                        '{"trait_type": "Success Rate Bonus", "value": ', _data.level.toString(), '},',
                        '{"trait_type": "Staked Value (USD)", "value": ', (_data.stakedValueUSD / 1e18).toString(), '}',
                    ']}'
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     * @notice 根據傳入的數據生成完整的 SVG 字串。
     */
    function generateSVG(VIPCardData memory _data) private pure returns (string memory) {
        (string memory highlightColor, string memory tierName) = getTierStyles(_data.level);

        // 計算進度條百分比
        uint256 progress = 0;
        if (_data.nextLevelRequirementUSD > _data.currentLevelRequirementUSD) {
           uint256 range = _data.nextLevelRequirementUSD - _data.currentLevelRequirementUSD;
           uint256 currentInLevel = _data.stakedValueUSD - _data.currentLevelRequirementUSD;
           if (range > 0) {
                progress = (currentInLevel * 100) / range;
           }
        }
        // 如果等級大於0，且下一級需求等於當前級需求（表示已達最高可計算等級），則進度條為滿
        if (_data.level > 0 && _data.nextLevelRequirementUSD <= _data.currentLevelRequirementUSD) {
            progress = 100;
        }

        return string(abi.encodePacked(
            '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">',
            _getDefs(highlightColor),
            '<rect width="100%" height="100%" rx="20" fill="url(#bg-gradient)"/>',
            '<rect width="100%" height="100%" rx="20" fill="url(#grid-pattern)"/>',
            _getStars(),
            '<text x="50%" y="60" text-anchor="middle" class="title-plat">', tierName, ' VIP PRIVILEGE</text>',
            '<g text-anchor="middle">',
                '<text x="50%" y="190" class="level-plat">', _data.level > 0 ? _data.level.toString() : "-", '</text>',
                '<text x="50%" y="235" class="bonus-plat">SUCCESS RATE +', _data.level.toString(), '%</text>',
            '</g>',
            _getProgressBar(progress, highlightColor, _data.stakedValueUSD, _data.nextLevelRequirementUSD),
            _getFooter(_data.tokenId),
            _getBorders(highlightColor),
            '</svg>'
        ));
    }

    // --- 內部 SVG 輔助函式 ---

    function getTierStyles(uint256 _level) private pure returns (string memory, string memory) {
        if (_level >= 13) return ("#a78bfa", "DIAMOND");  // 鑽石 (Lv. 13+)
        if (_level >= 10) return ("#E5E7EB", "PLATINUM"); // 白金 (Lv. 10-12)
        if (_level >= 7)  return ("#fbbd23", "GOLD");     // 黃金 (Lv. 7-9)
        if (_level >= 4)  return ("#C0C0C0", "SILVER");   // 白銀 (Lv. 4-6)
        if (_level >= 1)  return ("#cd7f32", "BRONZE");   // 青銅 (Lv. 1-3)
        return ("#6B7280", "STANDARD");                 // 標準 (Lv. 0)
    }

    function _getDefs(string memory highlightColor) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<defs>',
                '<radialGradient id="bg-gradient" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#2d2d2d" /><stop offset="100%" stop-color="#111111" /></radialGradient>',
                '<pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" stroke-width="0.2" opacity="0.05"/></pattern>',
                '<style>',
                    '@keyframes breathing-glow { 0% { text-shadow: 0 0 8px ', highlightColor, '; } 50% { text-shadow: 0 0 16px ', highlightColor, ', 0 0 24px ', highlightColor, '; } 100% { text-shadow: 0 0 8px ', highlightColor, '; } }',
                    '.title-plat { font-family: Georgia, serif; font-size: 22px; fill: #ffd700; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; }',
                    '.level-plat { font-family: sans-serif; font-size: 96px; fill: ', highlightColor, '; font-weight: bold; animation: breathing-glow 5s ease-in-out infinite; }',
                    '.bonus-plat { font-family: sans-serif; font-size: 20px; fill: ', highlightColor, '; opacity: 0.9; animation: breathing-glow 5s ease-in-out infinite; animation-delay: -0.2s;}',
                    '.card-id-plat { font-family: "Lucida Console", monospace; font-size: 12px; fill: #ffffff; opacity: 0.6;}',
                    '.progress-text { font-family: "Lucida Console", monospace; font-size: 11px; fill-opacity: 0.8; }',
                '</style>',
            '</defs>'
        ));
    }

    function _getStars() private pure returns (string memory) {
        return '<g opacity="0.7"><circle cx="50" cy="100" r="1.5" fill="white" fill-opacity="0.1"><animate attributeName="opacity" values="0.1;0.3;0.1" dur="5s" repeatCount="indefinite" begin="0s"/></circle><circle cx="320" cy="80" r="0.8" fill="white" fill-opacity="0.2"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="7s" repeatCount="indefinite" begin="-2s"/></circle><circle cx="150" cy="350" r="1.2" fill="white" fill-opacity="0.1"><animate attributeName="opacity" values="0.1;0.4;0.1" dur="6s" repeatCount="indefinite" begin="-1s"/></circle><circle cx="250" cy="280" r="1" fill="white" fill-opacity="0.3"><animate attributeName="opacity" values="0.3;0.1;0.3" dur="8s" repeatCount="indefinite" begin="-3s"/></circle></g>';
    }

    function _getProgressBar(uint256 progress, string memory color, uint256 current, uint256 next) private pure returns (string memory) {
        string memory progressWidth = (progress * 330 / 100).toString();
        string memory progressLabel;
        if (next > current) {
            progressLabel = string(abi.encodePacked((current/1e18).toString(), " / ", (next/1e18).toString(), " USD"));
        } else {
            progressLabel = string(abi.encodePacked("TIER ", (Math.sqrt(current / 100) / 1e9).toString(), " REACHED"));
        }
        return string(abi.encodePacked(
            '<g transform="translate(35, 280)">',
                '<rect x="0" y="0" width="330" height="18" rx="9" fill="#374151"/>',
                '<rect x="0" y="0" width="', progressWidth, '" height="18" rx="9" fill="', color, '"/>',
                '<text x="165" y="35" text-anchor="middle" class="progress-text" fill="white">', progressLabel, '</text>',
                '<text x="165" y="50" text-anchor="middle" class="progress-text" fill="#9ca3af" style="font-size: 9px;">(Staked Value in $SOUL)</text>',
            '</g>'
        ));
    }

    function _getFooter(uint256 tokenId) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="35" y="370" class="card-id-plat">CARD #', tokenId.toString(), '</text>',
            '<text x="365" y="370" text-anchor="end" class="card-id-plat" font-weight="bold">Dungeon Delvers</text>'
        ));
    }

    function _getBorders(string memory color) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<g stroke="', color, '" stroke-width="1.5" opacity="0.3">',
                '<path d="M 30 20 L 20 20 L 20 30" fill="none" />',
                '<path d="M 370 20 L 380 20 L 380 30" fill="none" />',
                '<path d="M 30 380 L 20 380 L 20 370" fill="none" />',
                '<path d="M 370 380 L 380 380 L 380 370" fill="none" />',
            '</g>'
        ));
    }
}
