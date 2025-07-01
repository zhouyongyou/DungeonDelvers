// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
// Note: We no longer need to import the interfaces just for the structs.
// The structs are now defined locally within this library.

/**
 * @title DungeonSVGLibrary (最終決定版 v4.2)
 * @author Your Team Name
 * @notice 統一的函式庫，為 Hero, Relic, Party 生成具有高級視覺風格的動態 SVG 和 TokenURI。
 * @dev 採用 400x400 方形設計，修正了所有 Unicode 編碼與結構體定義問題。
 */
library DungeonSVGLibrary {
    using Strings for uint256;
    using Strings for uint8;

    // ★★★★★ 核心修正 ★★★★★
    // 將數據結構直接定義在函式庫內部，解決 DeclarationError。
    struct HeroData {
        uint8 rarity;
        uint256 power;
        uint8 heroClass;
    }

    struct RelicData {
        uint8 rarity;
        uint8 capacity;
        uint8 element;
    }

    struct PartyData {
        uint256 tokenId;
        uint256 totalPower;
        uint256 heroCount;
        uint256 capacity;
        uint256 expeditions;
        uint8 partyRarity;
        string rarityTierName;
    }


    // --- Public URI Builders ---

    // ★★★★★ 核心修正：更新函式簽名，使用本地定義的 struct ★★★★★
    function buildHeroURI(HeroData memory _data, uint256 _tokenId, uint256 _expeditions) internal pure returns (string memory) {
        string memory svg = generateHeroSVG(_data, _tokenId, _expeditions);
        return _buildJSON("Hero", _tokenId, "A mighty hero of Dungeon Delvers.", svg);
    }

    function buildRelicURI(RelicData memory _data, uint256 _tokenId, uint256 _expeditions) internal pure returns (string memory) {
        string memory svg = generateRelicSVG(_data, _tokenId, _expeditions);
        return _buildJSON("Relic", _tokenId, "An ancient relic of great power.", svg);
    }

    function buildPartyURI(PartyData memory _data) internal pure returns (string memory) {
        string memory svg = generatePartySVG(_data);
        return _buildJSON("Party", _data.tokenId, "A brave party of delvers.", svg);
    }

    // --- SVG Generation ---

    function generateHeroSVG(HeroData memory _data, uint256 _tokenId, uint256 _expeditions) private pure returns (string memory) {
        (string memory primaryColor, string memory accentColor, string memory name, string memory emoji) = _getHeroStyles(_data.heroClass);
        
        return string(abi.encodePacked(
            _getSVGHeader(),
            _getGlobalStyles(),
            _getGradientDefs(primaryColor, accentColor),
            _getBackgroundPattern(primaryColor),
            _getBorder(_data.rarity),
            _getHeader(name, " HERO", _tokenId),
            _getCentralImage(emoji),
            _getPrimaryStat("POWER", _data.power.toString()),
            _getSecondaryStats("RARITY", _getRarityStars(_data.rarity), "EXPEDITIONS", _expeditions.toString()),
            _getFooter("Dungeon Delvers")
        ));
    }

    function generateRelicSVG(RelicData memory _data, uint256 _tokenId, uint256 _expeditions) private pure returns (string memory) {
        (string memory primaryColor, string memory accentColor, string memory name, string memory emoji) = _getRelicStyles(_data.element);

        return string(abi.encodePacked(
            _getSVGHeader(),
            _getGlobalStyles(),
            _getGradientDefs(primaryColor, accentColor),
            _getBackgroundPattern(primaryColor),
            _getBorder(_data.rarity),
            _getHeader(name, " RELIC", _tokenId),
            _getCentralImage(emoji),
            _getPrimaryStat("CAPACITY", _data.capacity.toString()),
            _getSecondaryStats("RARITY", _getRarityStars(_data.rarity), "EXPEDITIONS", _expeditions.toString()),
            _getFooter("Ancient Artifact")
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
            _getPartyStats(tierName, string(abi.encodePacked(_data.heroCount.toString(), " / ", _data.capacity.toString(), " SLOTS")), "EXPEDITIONS", _data.expeditions.toString()),
            _getFooter("United We Stand")
        ));
    }

    // --- SVG Components (400x400 Layout) ---

    function _getSVGHeader() private pure returns (string memory) {
        return '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">';
    }

    function _getGlobalStyles() private pure returns (string memory) {
        return "<style>.base{font-family: 'Georgia', serif; fill: #e0e0e0;}.title{font-size: 20px; font-weight: bold;}.subtitle{font-size: 14px; opacity: 0.7;}.stat-label{font-size: 12px; font-weight: bold; text-transform: uppercase; opacity: 0.6;}.stat-value{font-size: 16px; font-weight: bold;}.main-stat-value{font-size: 42px; font-weight: bold;}.footer-text{font-size: 12px; opacity: 0.5;}</style>";
    }

    function _getGradientDefs(string memory c1, string memory c2) private pure returns (string memory) {
        return string(abi.encodePacked('<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="', c1, '"/><stop offset="100%" stop-color="', c2, '"/></linearGradient></defs>'));
    }

    function _getBackgroundPattern(string memory color) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect width="400" height="400" fill="#111"/>',
            '<g opacity="0.1"><path d="M10 0 L0 10 M20 0 L0 20 M30 0 L0 30" stroke="', color, '" stroke-width="1"/><path d="M-10 400 L410 400" stroke="', color, '" stroke-width="2"/></g>'
        ));
    }

    function _getBorder(uint8 rarity) private pure returns (string memory) {
        return string(abi.encodePacked('<rect x="4" y="4" width="392" height="392" rx="15" fill="transparent" stroke="', _getRarityColor(rarity), '" stroke-width="2" stroke-opacity="0.8"/>'));
    }

    function _getHeader(string memory title, string memory subtitle, uint256 tokenId) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="20" y="38" class="base title">', title, '<tspan class="subtitle">', subtitle, '</tspan></text>',
            '<text x="380" y="38" class="base subtitle" text-anchor="end">#', tokenId.toString(), '</text>'
        ));
    }

    function _getCentralImage(string memory emoji) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="50" y="65" width="300" height="150" rx="10" fill="rgba(0,0,0,0.2)"/>',
            '<text x="50%" y="140" font-size="90" text-anchor="middle" dominant-baseline="middle">', emoji, '</text>'
        ));
    }

    function _getPrimaryStat(string memory label, string memory value) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="50%" y="245" class="base stat-label" text-anchor="middle">', label, '</text>',
            '<text x="50%" y="280" class="base main-stat-value" text-anchor="middle" fill="url(#grad)">', value, '</text>'
        ));
    }

    function _getSecondaryStats(string memory label1, string memory value1, string memory label2, string memory value2) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<line x1="20" y1="320" x2="380" y2="320" stroke="#444" stroke-width="1"/>',
            '<g text-anchor="middle">',
            '<text x="120" y="345" class="base stat-label">', label1, '</text>',
            '<text x="120" y="365" class="base stat-value">', value1, '</text>',
            '<text x="280" y="345" class="base stat-label">', label2, '</text>',
            '<text x="280" y="365" class="base stat-value">', value2, '</text>',
            '</g>'
        ));
    }

    function _getPartyStats(string memory label1, string memory value1, string memory label2, string memory value2) private pure returns (string memory) {
        return _getSecondaryStats(label1, value1, label2, value2);
    }

    function _getFooter(string memory text) private pure returns (string memory) {
        return string(abi.encodePacked('<text x="50%" y="390" class="base footer-text" text-anchor="middle">', text, '</text>'));
    }

    // --- Style Helpers ---
    function _getHeroStyles(uint8 id) private pure returns(string memory, string memory, string memory, string memory) {
        if (id == 0) return ("#B71C1C", "#F44336", "Warrior", unicode"⚔️");
        if (id == 1) return ("#1A237E", "#3F51B5", "Mage", unicode"🔮");
        if (id == 2) return ("#1B5E20", "#4CAF50", "Archer", unicode"🏹");
        if (id == 3) return ("#4A148C", "#9C27B0", "Rogue", unicode"🗡️");
        if (id == 4) return ("#F57F17", "#FFEB3B", "Cleric", unicode"✙");
        return ("#212121", "#757575", "Unknown", unicode"❓");
    }

    function _getRelicStyles(uint8 id) private pure returns(string memory, string memory, string memory, string memory) {
        if (id == 0) return ("#E65100", "#FF9800", "Fire", unicode"🔥");
        if (id == 1) return ("#01579B", "#03A9F4", "Water", unicode"💧");
        if (id == 2) return ("#3E2723", "#795548", "Earth", unicode"🪨");
        if (id == 3) return ("#81C784", "#C8E6C9", "Wind", unicode"🌬️");
        if (id == 4) return ("#F8BBD0", "#FCE4EC", "Light", unicode"✨");
        return ("#37474F", "#90A4AE", "Aether", unicode"🌀");
    }

    function _getPartyStyles(uint8 rarity) private pure returns(string memory, string memory, string memory) {
        if (rarity == 5) return ("#4A148C", "#E1BEE7", "Diamond Tier");
        if (rarity == 4) return ("#0D47A1", "#BBDEFB", "Platinum Tier");
        if (rarity == 3) return ("#FF6F00", "#FFECB3", "Gold Tier");
        if (rarity == 2) return ("#BDBDBD", "#FAFAFA", "Silver Tier");
        return ("#BF360C", "#FFCCBC", "Bronze Tier");
    }

    function _getRarityColor(uint8 rarity) private pure returns (string memory) {
        if (rarity == 5) return "#E040FB"; // Purple
        if (rarity == 4) return "#00B0FF"; // Blue
        if (rarity == 3) return "#FFD600"; // Gold
        if (rarity == 2) return "#CFD8DC"; // Silver
        return "#D7CCC8";                 // Bronze
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

    // --- JSON Builder ---
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
