// VRFManager.sol - 統一的 VRF 管理合約
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVRFCoordinatorV2Plus {
    function requestRandomWords(
        bytes32 keyHash,
        uint256 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        bytes calldata extraArgs
    ) external payable returns (uint256 requestId);
}

/**
 * @title VRFManager
 * @notice 統一管理所有合約的 VRF 請求，降低改動成本
 * @dev 作為中間層，讓現有合約最小改動即可使用 VRF
 */
contract VRFManager is Ownable, ReentrancyGuard {
    
    IVRFCoordinatorV2Plus public immutable vrfCoordinator;
    
    // VRF 配置
    bytes32 public keyHash = 0xba6e730de88d94a5510ae6613898bfb0c3de5d16e609c5b7da808747125506f7;
    uint32 public callbackGasLimit = 500000;
    uint16 public requestConfirmations = 3;
    uint256 public vrfRequestPrice = 0.005 ether;
    
    // 請求類型
    enum RequestType {
        HERO_MINT,
        RELIC_MINT,
        ALTAR_UPGRADE,
        DUNGEON_EXPLORE
    }
    
    struct RandomRequest {
        address requester;
        RequestType requestType;
        bytes data; // 額外數據
        bool fulfilled;
        uint256[] randomWords;
    }
    
    mapping(uint256 => RandomRequest) public requests;
    mapping(address => bool) public authorizedContracts;
    
    // 用戶到請求ID的映射（為了支持舊接口）
    mapping(address => uint256) public userToRequestId;
    mapping(address => uint256[]) public userRandomWords;
    
    event RandomRequested(uint256 indexed requestId, address indexed requester, RequestType requestType);
    event RandomFulfilled(uint256 indexed requestId, uint256[] randomWords);
    
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized");
        _;
    }
    
    constructor(address _vrfCoordinator) Ownable(msg.sender) {
        vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);
    }
    
    /**
     * @notice 請求隨機數（由授權合約調用）
     * @param requestType 請求類型
     * @param numWords 需要的隨機數數量
     * @param data 額外數據
     * @return requestId VRF 請求 ID
     */
    function requestRandomness(
        RequestType requestType,
        uint32 numWords,
        bytes calldata data
    ) external payable onlyAuthorized nonReentrant returns (uint256 requestId) {
        require(msg.value >= vrfRequestPrice, "Insufficient VRF fee");
        
        requestId = vrfCoordinator.requestRandomWords{value: vrfRequestPrice}(
            keyHash,
            0, // Direct funding
            requestConfirmations,
            callbackGasLimit,
            numWords,
            ""
        );
        
        requests[requestId] = RandomRequest({
            requester: msg.sender,
            requestType: requestType,
            data: data,
            fulfilled: false,
            randomWords: new uint256[](0)
        });
        
        // 退還多餘費用
        if (msg.value > vrfRequestPrice) {
            payable(msg.sender).transfer(msg.value - vrfRequestPrice);
        }
        
        emit RandomRequested(requestId, msg.sender, requestType);
    }
    
    /**
     * @notice 為用戶請求隨機數（兼容舊接口）
     * @param user 用戶地址
     * @param quantity 數量（轉為 numWords）
     * @param maxRarity 最大稀有度（忽略）
     * @param commitment 承諾哈希（儲存在 data 中）
     * @return requestId VRF 請求 ID
     */
    function requestRandomForUser(
        address user,
        uint256 quantity,
        uint8 maxRarity,
        bytes32 commitment
    ) external payable onlyAuthorized nonReentrant returns (uint256 requestId) {
        require(msg.value >= vrfRequestPrice, "Insufficient VRF fee");
        
        // 確定請求類型
        RequestType requestType = RequestType.HERO_MINT;
        
        uint32 numWords = uint32(quantity);
        if (numWords == 0) numWords = 1;
        
        requestId = vrfCoordinator.requestRandomWords{value: vrfRequestPrice}(
            keyHash,
            0, // Direct funding
            requestConfirmations,
            callbackGasLimit,
            numWords,
            ""
        );
        
        bytes memory data = abi.encode(user, quantity, maxRarity, commitment);
        
        requests[requestId] = RandomRequest({
            requester: msg.sender,
            requestType: requestType,
            data: data,
            fulfilled: false,
            randomWords: new uint256[](0)
        });
        
        // 記錄用戶映射
        userToRequestId[user] = requestId;
        
        // 退還多餘費用
        if (msg.value > vrfRequestPrice) {
            payable(msg.sender).transfer(msg.value - vrfRequestPrice);
        }
        
        emit RandomRequested(requestId, msg.sender, requestType);
    }
    
    /**
     * @notice 獲取 VRF 請求價格
     */
    function getVrfRequestPrice() external view returns (uint256) {
        return vrfRequestPrice;
    }
    
    /**
     * @notice VRF Coordinator 回調
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(msg.sender == address(vrfCoordinator), "Only VRF Coordinator");
        
        RandomRequest storage request = requests[requestId];
        require(!request.fulfilled, "Already fulfilled");
        
        request.fulfilled = true;
        request.randomWords = randomWords;
        
        // 如果這是用戶請求，儲存到用戶映射
        if (request.data.length > 0) {
            try this.decodeUserData(request.data) returns (address user, uint256, uint8, bytes32) {
                if (user != address(0)) {
                    userRandomWords[user] = randomWords;
                }
            } catch {
                // 無法解碼，可能是舊格式，跳過
            }
        }
        
        // 通知原始請求者
        IVRFCallback(request.requester).onVRFFulfilled(requestId, randomWords);
        
        emit RandomFulfilled(requestId, randomWords);
    }
    
    /**
     * @notice 解碼用戶數據（外部調用以捕獲錯誤）
     */
    function decodeUserData(bytes memory data) external pure returns (address user, uint256 quantity, uint8 maxRarity, bytes32 commitment) {
        return abi.decode(data, (address, uint256, uint8, bytes32));
    }
    
    /**
     * @notice 獲取用戶的隨機數結果（兼容舊接口）
     * @param user 用戶地址
     * @return fulfilled 是否已完成
     * @return randomWords 隨機數組
     */
    function getRandomForUser(address user) external view returns (bool fulfilled, uint256[] memory randomWords) {
        uint256 requestId = userToRequestId[user];
        if (requestId == 0) {
            return (false, new uint256[](0));
        }
        
        RandomRequest memory request = requests[requestId];
        return (request.fulfilled, userRandomWords[user]);
    }
    
    /**
     * @notice 獲取隨機結果
     */
    function getRandomResult(uint256 requestId) external view returns (bool fulfilled, uint256[] memory randomWords) {
        RandomRequest memory request = requests[requestId];
        return (request.fulfilled, request.randomWords);
    }
    
    /**
     * @notice 授權合約使用 VRF
     */
    function authorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = true;
    }
    
    /**
     * @notice 撤銷授權
     */
    function revokeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
    }
    
    /**
     * @notice 更新 VRF 配置
     */
    function updateVRFConfig(
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint256 _vrfRequestPrice
    ) external onlyOwner {
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        vrfRequestPrice = _vrfRequestPrice;
    }
    
    /**
     * @notice 提取合約餘額
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    receive() external payable {}
}

/**
 * @title IVRFCallback
 * @notice 合約需要實現此接口來接收 VRF 結果
 */
interface IVRFCallback {
    function onVRFFulfilled(uint256 requestId, uint256[] memory randomWords) external;
}