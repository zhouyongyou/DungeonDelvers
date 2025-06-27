// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title PlayerProfile
 * @author Your Name or Team Name
 * @notice 這是一個靈魂綁定代幣 (SBT)，用於代表玩家在 Dungeon Delvers 中的個人檔案與成就。
 * @dev 該合約遵循 ERC721 標準，但透過覆寫 _beforeTokenTransfer 使其不可轉讓。
 * 它儲存玩家的經驗值，並能動態生成一個包含等級和經驗數據的 SVG 作為 tokenURI。
 */
contract PlayerProfile is ERC721, Ownable {
    using Strings for uint256;

    // ... (狀態變數、事件、修改器、建構函式等保持不變) ...
    // =============================================================
    //                          狀態變數
    // =============================================================

    // 儲存每個 Profile NFT (tokenId) 對應的經驗值
    mapping(uint256 => uint256) public playerExperience;

    // 記錄玩家地址與其 Profile NFT 的 tokenId，方便反向查詢
    mapping(address => uint256) public profileTokenOf;

    // 只有 DungeonCore 合約可以呼叫函式來增減經驗值
    address public dungeonCoreAddress;

    // 內部計數器，用於生成新的 tokenId
    uint256 private _nextTokenId;

    // =============================================================
    //                            事件
    // =============================================================

    event ProfileCreated(address indexed player, uint256 indexed tokenId);
    event ExperienceAdded(uint256 indexed tokenId, uint256 amount, uint256 newTotalExperience);
    event DungeonCoreAddressUpdated(address indexed newAddress);

    // =============================================================
    //                          修改器
    // =============================================================

    modifier onlyDungeonCore() {
        require(msg.sender == dungeonCoreAddress, "Caller is not the authorized DungeonCore contract");
        _;
    }

    // =============================================================
    //                          建構函式
    // =============================================================

    constructor(address initialOwner) ERC721("Dungeon Delvers Profile", "DDP") Ownable(initialOwner) {
        _nextTokenId = 1; // Token ID 從 1 開始
    }

    // =============================================================
    //                        核心外部函式
    // =============================================================

    /**
     * @notice 鑄造一個新的玩家檔案 SBT (僅能由 DungeonCore 合約呼叫)
     * @param _player 要接收檔案的玩家地址
     * @return 新鑄造的檔案的 tokenId
     */
    function mintProfile(address _player) external onlyDungeonCore returns (uint256) {
        require(profileTokenOf[_player] == 0, "PlayerProfile: Profile already exists");
        
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(_player, tokenId);
        
        profileTokenOf[_player] = tokenId;
        playerExperience[tokenId] = 0; // 初始經驗為 0

        emit ProfileCreated(_player, tokenId);
        return tokenId;
    }

    /**
     * @notice 為指定的玩家增加經驗值 (僅能由 DungeonCore 合約呼叫)
     * @param _player 要增加經驗的玩家地址
     * @param _amount 要增加的經驗數量
     */
    function addExperience(address _player, uint256 _amount) external onlyDungeonCore {
        uint256 tokenId = profileTokenOf[_player];
        require(tokenId != 0, "PlayerProfile: Player does not have a profile");
        
        playerExperience[tokenId] += _amount;
        emit ExperienceAdded(tokenId, _amount, playerExperience[tokenId]);
    }

    // =============================================================
    //                        核心唯讀函式
    // =============================================================

    /**
     * @notice 根據經驗值計算玩家等級 (採用非線性成長曲線)
     * @param _exp 經驗值
     * @return 等級
     */
    function getLevel(uint256 _exp) public pure returns (uint256) {
        if (_exp < 100) return 1; // 100 EXP 以下為 1 級
        return sqrt(_exp / 100) + 1;
    }

    /**
     * @notice 計算升到下一級所需的總經驗值
     * @param _level 當前等級
     * @return 升到下一級所需的總經驗值
     */
    function getExpForNextLevel(uint256 _level) public pure returns (uint256) {
        if (_level == 0) return 0;
        return _level * _level * 100;
    }
    
    /**
     * @notice 覆寫 ERC721 的 tokenURI，動態生成一個包含鏈上數據的 SVG 圖片
     * @param _tokenId 玩家檔案的 tokenId
     * @return 一個 Base64 編碼的 Data URI
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");
        
        uint256 exp = playerExperience[_tokenId];
        uint256 level = getLevel(exp);
        uint256 expForNextLevel = getExpForNextLevel(level);
        uint256 expForCurrentLevel = getExpForNextLevel(level - 1);
        uint256 progress = 0;
        if(expForNextLevel > expForCurrentLevel) {
           progress = ((exp - expForCurrentLevel) * 100) / (expForNextLevel - expForCurrentLevel);
        }

        string memory svg = generateSVG(_tokenId, level, exp, progress);
        
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            '{"name":"Dungeon Delvers Profile #', _tokenId.toString(), '",',
                            '"description":"A soul-bound achievement token for Dungeon Delvers.",',
                            '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
                        )
                    )
                )
            )
        );
    }

    // =============================================================
    //                        管理員函式
    // =============================================================

    /**
     * @notice 設定 DungeonCore 合約地址 (僅限擁有者)
     * @param _address DungeonCore 合約的新地址
     */
    function setDungeonCoreAddress(address _address) public onlyOwner {
        dungeonCoreAddress = _address;
        emit DungeonCoreAddressUpdated(_address);
    }

    // =============================================================
    //                        內部與私有函式
    // =============================================================

    /**
     * @dev 覆寫此函式以實現「靈魂綁定」。
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal virtual override {
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    /**
     * @notice 【新】根據等級返回不同的顏色組合，實現徽章進化
     * @param _level 玩家等級
     * @return (邊框顏色, 背景顏色, 高亮顏色)
     */
    function getTierColors(uint256 _level) private pure returns (string memory, string memory, string memory) {
        if (_level >= 30) {
            return ("#C9B3F4", "#4A3F6D", "#A78BFA"); // 紫晶
        }
        if (_level >= 20) {
            return ("#FFD700", "#4D4223", "#FBBF24"); // 黃金
        }
        if (_level >= 10) {
            return ("#C0C0C0", "#4B5563", "#9CA3AF"); // 白銀
        }
        return ("#CD7F32", "#422C1A", "#D97706"); // 青銅
    }

    /**
     * @notice 【強化版】產生 SVG 圖片的內部函式
     * @return SVG 圖片的字串
     */
    function generateSVG(uint256 _tokenId, uint256 _level, uint256 _exp, uint256 _progress) private view returns (string memory) {
        string memory ownerAddress = Strings.toHexString(uint160(ownerOf(_tokenId)), 20);
        
        // 根據等級獲取當前的顏色主題
        (string memory borderColor, string memory bgColor, string memory highlightColor) = getTierColors(_level);

        return string(abi.encodePacked(
            '<svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">',
            '<defs><style>',
            // 使用更具風格的字體
            '.text { font-family: "Georgia", serif; fill: #F3EFE0; }',
            '.header { font-size: 24px; font-weight: bold; letter-spacing: 1px; }',
            '.subheader { font-size: 14px; fill-opacity: 0.8; }',
            '.stats { font-size: 14px; }',
            '.level-text { font-size: 48px; font-weight: bold; }',
            '</style></defs>',
            // 使用動態背景色
            '<rect width="100%" height="100%" rx="15" fill="', bgColor, '"/>',
            // 加上一個微妙的背景紋理
            '<rect x="0" y="0" width="100%" height="100%" fill="url(#pattern)"/>',
            '<defs><pattern id="pattern" patternUnits="userSpaceOnUse" width="20" height="20">',
            '<path d="M-5,0 l10,10 M0,0 l10,10 M-5,10 l10,10 M0,20 l10,-10" stroke-width="0.5" stroke="rgba(255,255,255,0.05)"/>',
            '</pattern></defs>',
            // 使用動態邊框色
            '<rect x="5" y="5" width="290" height="390" rx="10" fill="none" stroke="', borderColor, '" stroke-width="2"/>',
            
            // 標題
            '<text x="50%" y="45" text-anchor="middle" class="text header">PLAYER PROFILE</text>',
            '<text x="50%" y="70" text-anchor="middle" class="text subheader">Token ID: ', _tokenId.toString(), '</text>',
            
            // 等級徽章
            '<circle cx="150" cy="150" r="55" fill="none" stroke="', highlightColor, '" stroke-width="4"/>',
            '<text x="50%" y="162" text-anchor="middle" class="text level-text" fill="', highlightColor, '">', _level.toString(), '</text>',
            '<text x="50%" y="125" text-anchor="middle" class="text subheader">LEVEL</text>',

            // 數據統計
            '<text x="30" y="260" class="text stats">Owner: ', ownerAddress, '</text>',
            '<text x="30" y="290" class="text stats">Experience: ', _exp.toString(), ' EXP</text>',
            
            // 經驗條
            '<text x="30" y="330" class="text stats">Progress to Next Level:</text>',
            '<rect x="30" y="340" width="240" height="20" rx="10" fill="rgba(0,0,0,0.3)"/>',
            '<rect x="30" y="340" width="', (_progress * 240 / 100).toString(), '" height="20" rx="10" fill="', highlightColor, '"/>',
            '<text x="50%" y="355" text-anchor="middle" font-size="12" fill="white">',_progress.toString(),'%</text>',
            
            '</svg>'
        ));
    }

    /**
     * @dev 計算 uint256 的整數平方根
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    // The following functions are overrides required by Solidity.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, Ownable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
