// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

library ProfileSVGLibrary {
    using Strings for uint256;

    function buildTokenURI(uint256 _tokenId, uint256 _exp) internal pure returns (string memory) {
        uint256 level = getLevel(_exp);
        string memory svg = generateSVG(_tokenId, _exp, level);
        
        string memory json = Base64.encode(
            bytes(
                abi.encodePacked(
                    '{"name":"Dungeon Delvers Profile #', _tokenId.toString(), '",',
                    '"description":"A soul-bound achievement token for Dungeon Delvers.",',
                    '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                    '"attributes": [',
                        '{"trait_type": "Level", "value": ', level.toString(), '},',
                        '{"trait_type": "Experience", "value": ', _exp.toString(), '}',
                    ']}'
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function getLevel(uint256 _exp) internal pure returns (uint256) {
        if (_exp < 100) return 1;
        return Math.sqrt(_exp / 100) + 1;
    }

    function getExpForNextLevel(uint256 _level) internal pure returns (uint256) {
        if (_level == 0) return 0;
        return _level * _level * 100;
    }

    function generateSVG(uint256 _tokenId, uint256 _exp, uint256 _level) private pure returns (string memory) {
        uint256 expForNextLevel = getExpForNextLevel(_level);
        uint256 expForCurrentLevel = getExpForNextLevel(_level - 1);
        
        uint256 progress = 0;
        if (expForNextLevel > expForCurrentLevel) {
           progress = ((_exp - expForCurrentLevel) * 100) / (expForNextLevel - expForCurrentLevel);
        }

        (string memory bgColor, string memory highlightColor, string memory gradientStop2) = getTierColors(_level);
        
        return string(abi.encodePacked(
            '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">',
            _generateSVGDefs(highlightColor, gradientStop2),
            '<rect width="100%" height="100%" rx="20" fill="', bgColor, '"/>',
            _generateStars(),
            '<g filter="url(#glow)">',
            _generateArcs(_level, highlightColor),
            _generateProgressArc(_level, progress),
            '</g>',
            _generateTextContent(_tokenId, _level, _exp - expForCurrentLevel, expForNextLevel - expForCurrentLevel, highlightColor),
            '<rect x="2" y="2" width="396" height="396" rx="18" fill="none" stroke="url(#border-gradient)" stroke-width="4"/>',
            '</svg>'
        ));
    }

    function getTierColors(uint256 _level) private pure returns (string memory, string memory, string memory) {
        if (_level >= 30) return ("#4A3F6D", "#A78BFA", "#7C3AED");
        if (_level >= 20) return ("#4D4223", "#FBBF24", "#F59E0B");
        if (_level >= 10) return ("#4B5563", "#9CA3AF", "#E5E7EB");
        return ("#422C1A", "#D97706", "#F59E0B");
    }

    function _generateSVGDefs(string memory highlightColor, string memory gradientStop2) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<defs><style>',
            '.text{font-family:Georgia,serif;fill:#F3EFE0;text-shadow:0 0 5px rgba(0,0,0,0.5);}',
            '.header{font-size:24px;font-weight:bold;}',
            '.level-text{font-size:56px;font-weight:bold;}',
            '.exp-text{font-size:14px;fill-opacity:0.9;}',
            '</style>',
            '<linearGradient id="border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" stop-color="', highlightColor, '"/><stop offset="100%" stop-color="', gradientStop2, '"/>',
            '<animateTransform attributeName="gradientTransform" type="rotate" from="0 200 200" to="360 200 200" dur="5s" repeatCount="indefinite"/>',
            '</linearGradient>',
            '<linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" stop-color="', gradientStop2, '"/><stop offset="100%" stop-color="', highlightColor, '"/>',
            '</linearGradient>',
            '<filter id="glow"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
            '</defs>'
        ));
    }
    
    function _generateStars() private pure returns (string memory) {
        return string(abi.encodePacked(
            '<g opacity="0.7">',
            '<circle cx="50" cy="50" r="1" fill="white" fill-opacity="0.5"><animate attributeName="fill-opacity" values="0.5;1;0.5" dur="4s" repeatCount="indefinite" begin="-2s"/></circle>',
            '<circle cx="300" cy="80" r="0.8" fill="white" fill-opacity="0.8"><animate attributeName="fill-opacity" values="0.8;0.3;0.8" dur="3s" repeatCount="indefinite"/></circle>',
            '<circle cx="150" cy="320" r="1.2" fill="white" fill-opacity="0.6"><animate attributeName="fill-opacity" values="0.6;1;0.6" dur="5s" repeatCount="indefinite" begin="-1s"/></circle>',
            '</g>'
        ));
    }

    function _generateArcs(uint256 _level, string memory highlightColor) private pure returns (string memory) {
        uint256 maxArcs = (_level / 5) + 1;
        if (maxArcs > 10) maxArcs = 10;
        uint256 baseRadius = 60;
        uint256 radiusStep = 10;
        
        string memory arcsHTML = "";
        for (uint i = 0; i < maxArcs - 1; i++) {
            uint256 radius = baseRadius + i * radiusStep;
            arcsHTML = string(abi.encodePacked(arcsHTML, '<circle cx="200" cy="200" r="', radius.toString(), '" fill="none" stroke="', highlightColor, '" stroke-width="4" stroke-opacity="0.2"/>'));
        }
        return arcsHTML;
    }

    function _generateProgressArc(uint256 _level, uint256 _progress) private pure returns (string memory) {
        uint256 maxArcs = (_level / 5) + 1;
        if (maxArcs > 10) maxArcs = 10;
        uint256 activeRadius = 60 + (maxArcs - 1) * 10;
        uint256 circumference = 314159 * 2 * activeRadius / 100000;
        uint256 strokeDashoffset = circumference * (100 - _progress) / 100;

        return string(abi.encodePacked(
            '<circle cx="200" cy="200" r="', activeRadius.toString(), '" fill="none" stroke="white" stroke-width="5" stroke-opacity="0.3"/>',
            '<circle cx="200" cy="200" r="', activeRadius.toString(), '" fill="none" stroke="url(#progress-gradient)" stroke-width="5"',
            ' stroke-dasharray="', circumference.toString(), '"',
            ' stroke-dashoffset="', strokeDashoffset.toString(), '"',
            ' transform="rotate(-90 200 200)">',
            '<animateTransform attributeName="transform" type="rotate" from="-90 200 200" to="270 200 200" dur="10s" repeatCount="indefinite"/>',
            '</circle>'
        ));
    }
    
    function _generateTextContent(uint256 _tokenId, uint256 _level, uint256 currentExpInLevel, uint256 expNeededForNext, string memory highlightColor) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<g>',
            '<text x="50%" y="45%" text-anchor="middle" dominant-baseline="middle" class="text level-text" fill="', highlightColor, '">', _level.toString(),'</text>',
            '<text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" class="text" style="font-size:16px;opacity:0.8;">LEVEL</text>',
            '<text x="50%" y="12%" text-anchor="middle" class="text header">PLAYER PROFILE #', _tokenId.toString(),'</text>',
            '<text x="50%" y="90%" text-anchor="middle" class="text exp-text">', currentExpInLevel.toString(), ' / ', expNeededForNext.toString(), ' EXP</text>',
            '</g>'
        ));
    }
}
