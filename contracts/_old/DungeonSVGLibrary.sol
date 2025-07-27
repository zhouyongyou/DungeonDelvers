// contracts/libraries/DungeonSVGLibrary.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title DungeonSVGLibrary (V2 - 簡化版)
 * @author Z
 * @notice 一個統一的函式庫，為 Hero, Relic, Party 生成鏈上動態 SVG。
 * @dev 此版本與核心合約功能同步，暫時移除了英雄職業、聖物屬性等未來擴展功能。
 */
library DungeonSVGLibrary {
    using Strings for uint256;
    using Strings for uint8;

    // --- 數據結構定義 (已簡化) ---
    struct HeroData {
        uint8 rarity;
        uint256 power;
        // uint8 heroClass; // 暫時移除
    }

    struct RelicData {
        uint8 rarity;
        uint8 capacity;
        // uint8 element; // 暫時移除
    }

    struct PartyData {
        uint256 tokenId;
        uint256 totalPower;
        uint256 heroCount;
        uint256 capacity;
        // uint256 expeditions; // 暫時移除
        uint8 partyRarity;
    }

    // --- 公共入口函式 ---

    function buildHeroURI(HeroData memory _data, uint256 _tokenId) internal pure returns (string memory) {
        string memory svg = generateHeroSVG(_data, _tokenId);
        return _buildJSON("Hero", _tokenId, "A mighty hero of Dungeon Delvers.", svg);
    }

    function buildRelicURI(RelicData memory _data, uint256 _tokenId) internal pure returns (string memory) {
        string memory svg = generateRelicSVG(_data, _tokenId);
        return _buildJSON("Relic", _tokenId, "An ancient relic of great power.", svg);
    }

    function buildPartyURI(PartyData memory _data) internal pure returns (string memory) {
        string memory svg = generatePartySVG(_data);
        return _buildJSON("Party", _data.tokenId, "A brave party of delvers.", svg);
    }

    // --- SVG 生成主函式 ---

    function generateHeroSVG(HeroData memory _data, uint256 _tokenId) private pure returns (string memory) {
        (string memory primaryColor, string memory accentColor) = _getHeroStyles();
        
        return string(abi.encodePacked(
            _getSVGHeader(),
            _getGlobalStyles(),
            _getGradientDefs(primaryColor, accentColor),
            _getBackgroundPattern(primaryColor),
            _getBorder(_data.rarity),
            _getHeader("Hero", "", _tokenId),
            _getCentralImage(unicode"⚔️"),
            _getPrimaryStat("POWER", _data.power.toString()),
            _getSecondaryStats("RARITY", _getRarityStars(_data.rarity), "", ""), // 移除了遠征次數
            _getFooter("Dungeon Delvers"),
            '</svg>'
        ));
    }

    function generateRelicSVG(RelicData memory _data, uint256 _tokenId) private pure returns (string memory) {
        (string memory primaryColor, string memory accentColor) = _getRelicStyles();

        return string(abi.encodePacked(
            _getSVGHeader(),
            _getGlobalStyles(),
            _getGradientDefs(primaryColor, accentColor),
            _getBackgroundPattern(primaryColor),
            _getBorder(_data.rarity),
            _getHeader("Relic", "", _tokenId),
            _getCentralImage(unicode"💎"), // 使用通用圖示
            _getPrimaryStat("CAPACITY", _data.capacity.toString()),
            _getSecondaryStats("RARITY", _getRarityStars(_data.rarity), "", ""), // 移除了遠征次數
            _getFooter("Ancient Artifact"),
            '</svg>'
        ));
    }
    
    function generatePartySVG(PartyData memory _data) private pure returns (string memory) {
        (string memory primaryColor, string memory accentColor, string memory tierName) = _getPartyStyles(_data.partyRarity);

        return string(abi.encodePacked(
            _getSVGHeader(),
            _getGlobalStyles(),
            _getGradientDefs(primaryColor, accentColor),
            _getBackgroundPattern(primaryColor),
            _getBorder(_data.partyRarity),
            _getHeader("Delvers", " PARTY", _data.tokenId),
            _getCentralImage(unicode"🛡️"),
            _getPrimaryStat("TOTAL POWER", _data.totalPower.toString()),
            _getPartyStats(tierName, string(abi.encodePacked(_data.heroCount.toString(), " / ", _data.capacity.toString(), " SLOTS")), "", ""), // 移除了遠征次數
            _getFooter("United We Stand"),
            '</svg>'
        ));
    }

    // --- 可重用的 SVG 元件函式 ---

    function _getSVGHeader() private pure returns (string memory) { return '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">'; }
    function _getGlobalStyles() private pure returns (string memory) { return "<style>.base{font-family: 'Georgia', serif; fill: #e0e0e0;}.title{font-size: 20px; font-weight: bold;}.subtitle{font-size: 14px; opacity: 0.7;}.stat-label{font-size: 12px; font-weight: bold; text-transform: uppercase; opacity: 0.6;}.stat-value{font-size: 16px; font-weight: bold;}.main-stat-value{font-size: 42px; font-weight: bold;}.footer-text{font-size: 12px; opacity: 0.5;}</style>"; }
    function _getGradientDefs(string memory c1, string memory c2) private pure returns (string memory) { return string(abi.encodePacked('<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="', c1, '"/><stop offset="100%" stop-color="', c2, '"/></linearGradient></defs>')); }
    function _getBackgroundPattern(string memory color) private pure returns (string memory) { return string(abi.encodePacked('<rect width="400" height="400" fill="#111"/><g opacity="0.1"><path d="M10 0 L0 10 M20 0 L0 20 M30 0 L0 30" stroke="', color, '" stroke-width="1"/><path d="M-10 400 L410 400" stroke="', color, '" stroke-width="2"/></g>')); }
    function _getBorder(uint8 rarity) private pure returns (string memory) { return string(abi.encodePacked('<rect x="4" y="4" width="392" height="392" rx="15" fill="transparent" stroke="', _getRarityColor(rarity), '" stroke-width="2" stroke-opacity="0.8"/>')); }
    function _getHeader(string memory title, string memory subtitle, uint256 tokenId) private pure returns (string memory) { return string(abi.encodePacked('<text x="20" y="38" class="base title">', title, '<tspan class="subtitle">', subtitle, '</tspan></text>','<text x="380" y="38" class="base subtitle" text-anchor="end">#', tokenId.toString(), '</text>')); }
    function _getCentralImage(string memory emoji) private pure returns (string memory) { return string(abi.encodePacked('<rect x="50" y="65" width="300" height="150" rx="10" fill="rgba(0,0,0,0.2)"/>', '<text x="50%" y="140" font-size="90" text-anchor="middle" dominant-baseline="middle">', emoji, '</text>')); }
    function _getPrimaryStat(string memory label, string memory value) private pure returns (string memory) { return string(abi.encodePacked('<text x="50%" y="245" class="base stat-label" text-anchor="middle">', label, '</text>', '<text x="50%" y="280" class="base main-stat-value" text-anchor="middle" fill="url(#grad)">', value, '</text>')); }
    function _getSecondaryStats(string memory label1, string memory value1, string memory label2, string memory value2) private pure returns (string memory) { return string(abi.encodePacked('<line x1="20" y1="320" x2="380" y2="320" stroke="#444" stroke-width="1"/>', '<g text-anchor="middle">', '<text x="120" y="345" class="base stat-label">', label1, '</text>', '<text x="120" y="365" class="base stat-value">', value1, '</text>', '<text x="280" y="345" class="base stat-label">', label2, '</text>', '<text x="280" y="365" class="base stat-value">', value2, '</text>', '</g>')); }
    function _getPartyStats(string memory label1, string memory value1, string memory label2, string memory value2) private pure returns (string memory) { return _getSecondaryStats(label1, value1, label2, value2); }
    function _getFooter(string memory text) private pure returns (string memory) { return string(abi.encodePacked('<text x="50%" y="390" class="base footer-text" text-anchor="middle">', text, '</text>')); }

    // --- 風格定義函式 (已簡化) ---

    function _getHeroStyles() private pure returns(string memory, string memory) {
        return ("#B71C1C", "#F44336"); // 通用英雄風格
    }

    function _getRelicStyles() private pure returns(string memory, string memory) {
        return ("#1A237E", "#3F51B5"); // 通用聖物風格
    }

    function _getPartyStyles(uint8 rarity) private pure returns(string memory, string memory, string memory) {
        if (rarity == 5) return ("#4A148C", "#E1BEE7", "Diamond Tier");
        if (rarity == 4) return ("#0D47A1", "#BBDEFB", "Platinum Tier");
        if (rarity == 3) return ("#FF6F00", "#FFECB3", "Gold Tier");
        if (rarity == 2) return ("#BDBDBD", "#FAFAFA", "Silver Tier");
        return ("#BF360C", "#FFCCBC", "Bronze Tier");
    }

    function _getRarityColor(uint8 rarity) private pure returns (string memory) {
        if (rarity == 5) return "#E040FB"; // 紫色
        if (rarity == 4) return "#00B0FF"; // 藍色
        if (rarity == 3) return "#FFD600"; // 金色
        if (rarity == 2) return "#CFD8DC"; // 銀色
        return "#D7CCC8"; // 銅色
    }

    function _getRarityStars(uint8 rarity) private pure returns (string memory) {
        string memory stars;
        string memory color = _getRarityColor(rarity);
        string memory starSymbol = unicode"★"; 
        for (uint i = 0; i < 5; i++) {
            stars = string(abi.encodePacked(stars, '<tspan fill="', color, '" fill-opacity="', i < rarity ? '1' : '0.2', '">', starSymbol, '</tspan>'));
        }
        return stars;
    }

    function _buildJSON(string memory name, uint256 tokenId, string memory description, string memory svg) private pure returns (string memory) {
        return string(abi.encodePacked(
            'data:application/json;base64,',
            Base64.encode(bytes(abi.encodePacked(
                '{"name":"', name, ' #', tokenId.toString(), '",',
                '"description":"', description, '",',
                '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
            )))
        ));
    }
}
