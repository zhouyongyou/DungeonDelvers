// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title DungeonSVGLibrary
 * @author Your Team Name
 * @notice 一個統一的函式庫，負責為 Hero, Relic, Party 生成動態 SVG 和 TokenURI。
 * @dev 融合了高級視覺風格與豐富的資訊呈現。
 */
library DungeonSVGLibrary {
    using Strings for uint256;

    // --- Hero ---
    struct HeroData {
        uint256 tokenId;
        uint8 rarity;
        uint256 power;
        uint256 expeditions;
        uint8 heroClass;
    }

    function buildHeroURI(HeroData memory _data) internal pure returns (string memory) {
        string memory svg = generateHeroSVG(_data);
        return _buildJSON("Hero", _data.tokenId, "A mighty hero of Dungeon Delvers.", svg);
    }

    // --- Relic ---
    struct RelicData {
        uint256 tokenId;
        uint8 rarity;
        uint8 capacity;
        uint256 expeditions;
        uint8 element;
    }

    function buildRelicURI(RelicData memory _data) internal pure returns (string memory) {
        string memory svg = generateRelicSVG(_data);
        return _buildJSON("Relic", _data.tokenId, "An ancient relic of great power.", svg);
    }

    // --- Party ---
    struct PartyData {
        uint256 tokenId;
        uint256 totalPower;
        uint256 heroCount;
        uint256 relicCount;
        uint256 capacity;
        uint256 expeditions;
        string heroComposition;
        string relicComposition;
    }

    function buildPartyURI(PartyData memory _data) internal pure returns (string memory) {
        string memory svg = generatePartySVG(_data);
        return _buildJSON("Party", _data.tokenId, "A brave party of delvers.", svg);
    }

    // --- SVG Generation ---

    function generateHeroSVG(HeroData memory _data) private pure returns (string memory) {
        (string memory bgColor, string memory color1, string memory color2, string memory name, string memory emoji) = _getHeroStyles(_data.heroClass);
        return string(abi.encodePacked(
            _getSVGHeader(),
            _getDefs(color1, color2),
            _getBackground(bgColor),
            _getCentralText(_data.power.toString(), "POWER", color1),
            _getHeader(name, " HERO"),
            _getRarityStars(_data.rarity),
            '<g transform="translate(60, 260)">',
            _getStatLine("Class", string(abi.encodePacked(name, " ", emoji)), 0),
            _getStatLine("Expeditions", _data.expeditions.toString(), 25),
            '</g>',
            _getBorder(color1, color2),
            _getFooter(_data.tokenId),
            '</svg>'
        ));
    }

    function generateRelicSVG(RelicData memory _data) private pure returns (string memory) {
        (string memory bgColor, string memory color1, string memory color2, string memory name, string memory emoji) = _getRelicStyles(_data.element);
        return string(abi.encodePacked(
            _getSVGHeader(),
            _getDefs(color1, color2),
            _getBackground(bgColor),
            _getCentralText(_data.capacity.toString(), "CAPACITY", color1),
            _getHeader(name, " RELIC"),
            _getRarityStars(_data.rarity),
             '<g transform="translate(60, 260)">',
            _getStatLine("Element", string(abi.encodePacked(name, " ", emoji)), 0),
            _getStatLine("Expeditions", _data.expeditions.toString(), 25),
            '</g>',
            _getBorder(color1, color2),
            _getFooter(_data.tokenId),
            '</svg>'
        ));
    }
    
    function generatePartySVG(PartyData memory _data) private pure returns (string memory) {
        (string memory bgColor, string memory color1, string memory color2) = _getPartyStyles(_data.capacity);
        return string(abi.encodePacked(
            _getSVGHeader(),
            _getDefs(color1, color2),
            _getBackground(bgColor),
            _getCentralText(_data.totalPower.toString(), "TOTAL POWER", color1),
            _getHeader("Delvers", " PARTY"),
            '<g transform="translate(40, 240)">',
            _getStatLine("Capacity Used", string(abi.encodePacked(_data.heroCount.toString(), " / ", _data.capacity.toString())), 0),
            '<line x1="0" y1="25" x2="320" y2="25" stroke="#fff" stroke-opacity="0.1"/>',
            _getStatLine("Hero Rarity", _data.heroComposition, 30),
            _getStatLine("Relic Rarity", _data.relicComposition, 55),
            '</g>',
            '<text x="50%" y="88%" text-anchor="middle" class="text" style="font-size:12px;opacity:0.7;">Expeditions: ', _data.expeditions.toString(), '</text>',
            _getBorder(color1, color2),
            _getFooter(_data.tokenId),
            '</svg>'
        ));
    }

    // --- SVG Components ---
    function _getSVGHeader() private pure returns (string memory) {
        return '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">';
    }

    function _getDefs(string memory c1, string memory c2) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<defs><style>.text{font-family:Georgia,serif;fill:#F3EFE0;}.header{font-size:22px;font-weight:bold;letter-spacing:1px;}.main-value{font-size:80px;font-weight:bold;}.sub-text{font-size:16px;fill-opacity:0.8;letter-spacing:1px;}.stat-label{font-family:monospace;font-size:14px;fill:#a1a1aa;}.stat-value{font-family:monospace;font-size:14px;fill:white;font-weight:bold;}</style>',
            '<linearGradient id="b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="',c1,'"/><stop offset="100%" stop-color="',c2,'"/><animateTransform attributeName="gradientTransform" type="rotate" from="0 200 200" to="360 200 200" dur="5s" repeatCount="indefinite"/></linearGradient>',
            '<filter id="g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
            '</defs>'
        ));
    }

    function _getBackground(string memory bgColor) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect width="100%" height="100%" rx="20" fill="', bgColor, '"/>',
            '<g opacity="0.3" fill="white"><circle cx="50" cy="50" r="1" fill-opacity="0.5"><animate attributeName="r" values="1;1.5;1" dur="4s" repeatCount="indefinite" begin="-2s"/></circle><circle cx="300" cy="80" r="0.8" fill-opacity="0.8"><animate attributeName="r" values="0.8;1.2;0.8" dur="3s" repeatCount="indefinite"/></circle><circle cx="150" cy="320" r="1.2" fill-opacity="0.6"><animate attributeName="r" values="1.2;1.8;1.2" dur="5s" repeatCount="indefinite" begin="-1s"/></circle></g>'
        ));
    }
    
    function _getHeader(string memory t1, string memory t2) private pure returns (string memory) {
        return string(abi.encodePacked('<text x="50%" y="12%" text-anchor="middle" class="text header">', t1, '<tspan fill-opacity="0.6">', t2, '</tspan></text>'));
    }

    function _getCentralText(string memory val, string memory sub, string memory color) private pure returns (string memory) {
        return string(abi.encodePacked('<g text-anchor="middle" class="text" filter="url(#g)"><text x="50%" y="48%" dominant-baseline="middle" class="main-value" fill="',color,'">',val,'</text><text x="50%" y="62%" dominant-baseline="middle" class="sub-text">',sub,'</text></g>'));
    }

    function _getRarityStars(uint8 rarity) private pure returns (string memory) {
        string memory stars;
        for (uint i = 0; i < 5; i++) {
            stars = string(abi.encodePacked(stars, '<text fill-opacity="', i < rarity ? '1' : '0.2', '">★</text>'));
        }
        return string(abi.encodePacked('<text x="50%" y="20%" text-anchor="middle" font-size="24" fill="#ffd700">', stars, '</text>'));
    }
    
    function _getStatLine(string memory label, string memory value, uint256 y) private pure returns (string memory) {
        return string(abi.encodePacked('<g transform="translate(40, ',y.toString(),')"><text x="0" y="15" class="stat-label">',label,'</text><text x="320" y="15" text-anchor="end" class="stat-value">',value,'</text></g>'));
    }

    function _getBorder(string memory c1, string memory c2) private pure returns (string memory) {
        return string(abi.encodePacked('<rect x="2" y="2" width="396" height="396" rx="18" fill="none" stroke="url(#b)" stroke-width="4"/>'));
    }

    function _getFooter(uint256 tokenId) private pure returns (string memory) {
        return string(abi.encodePacked('<text x="50%" y="95%" text-anchor="middle" class="text" style="font-size:12px;opacity:0.5;">#', tokenId.toString(), '</text>'));
    }

    // --- Style Definitions ---
    function _getHeroStyles(uint8 id) private pure returns(string memory, string memory, string memory, string memory, string memory) {
        if (id == 0) return ("#450a0a", "#ef4444", "#f87171", "Warrior", "⚔️");
        if (id == 1) return ("#1e3a8a", "#3b82f6", "#60a5fa", "Mage", "🔮");
        if (id == 2) return ("#14532d", "#22c55e", "#4ade80", "Archer", "🏹");
        if (id == 3) return ("#581c87", "#a855f7", "#c084fc", "Rogue", "🗡️");
        if (id == 4) return ("#713f12", "#eab308", "#fde047", "Cleric", "✙");
        return ("#1f2937", "#6b7280", "#9ca3af", "Unknown", "❓");
    }

    function _getRelicStyles(uint8 id) private pure returns(string memory, string memory, string memory, string memory, string memory) {
        if (id == 0) return ("#7c2d12", "#f97316", "#fb923c", "Fire", "🔥");
        if (id == 1) return ("#0c4a6e", "#0ea5e9", "#38bdf8", "Water", "💧");
        if (id == 2) return ("#713f12", "#a16207", "#ca8a04", "Earth", "🪨");
        if (id == 3) return ("#065f46", "#10b981", "#6ee7b7", "Wind", "🌬️");
        if (id == 4) return ("#7e22ce", "#d8b4fe", "#e9d5ff", "Light", "✨");
        return ("#1f2937", "#6b7280", "#9ca3af", "Aether", "🌀");
    }

    function _getPartyStyles(uint256 capacity) private pure returns(string memory, string memory, string memory) {
        if (capacity >= 20) return ("#581c87", "#a855f7", "#c084fc"); // Diamond
        if (capacity >= 15) return ("#1e3a8a", "#60a5fa", "#93c5fd"); // Platinum
        if (capacity >= 10) return ("#713f12", "#eab308", "#fde047"); // Gold
        if (capacity >= 5)  return ("#4b5563", "#9ca3af", "#e5e7eb"); // Silver
        return ("#422C1A", "#D97706", "#F59E0B");                     // Bronze
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
