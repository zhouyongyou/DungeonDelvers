// DungeonMasterVRF.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// --- 介面定義 ---
interface IDungeonMaster {
    function processExpeditionResult(uint256 requestId, uint256[] memory randomWords) external;
}

/**
 * @title DungeonMasterVRF
 * @notice DungeonMaster 的專用 VRF 衛星合約，負責與 Chainlink VRF 互動。
 * @dev 將 VRF 邏輯分離，使主合約更簡潔，並便於未來升級。
 */
contract DungeonMasterVRF is Ownable, VRFV2PlusWrapperConsumerBase {

    // --- 狀態變數 ---
    IDungeonMaster public dungeonMaster;

    // VRF 相關設定
    uint32 private callbackGasLimit = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event RequestSent(uint256 indexed requestId, address indexed requester);
    event DungeonMasterSet(address indexed newAddress);

    // --- 構造函數 ---
    constructor(address _vrfWrapper, address _initialOwner)
        VRFV2PlusWrapperConsumerBase(_vrfWrapper)
        Ownable(_initialOwner)
    {}

    // --- 核心功能 ---

    /**
     * @notice 由 DungeonMaster 呼叫，用以發送一個隨機數請求。
     * @return requestId 該請求的唯一 ID。
     */
    // ★ 警告修正：移除了未使用的參數名稱 _partyId 和 _dungeonId，以消除編譯器警告。
    // 這明確表示此函式僅作為請求轉發，不處理遊戲邏輯。
    function sendRequest(address _requester, uint256 /*_partyId*/, uint256 /*_dungeonId*/) external returns (uint256 requestId) {
        require(msg.sender == address(dungeonMaster), "VRF: Caller is not the DungeonMaster");
        
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (requestId, ) = requestRandomnessPayInNative(callbackGasLimit, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        
        emit RequestSent(requestId, _requester);
        return requestId;
    }

    /**
     * @notice Chainlink VRF 的回調函式。
     * @dev 當收到隨機數後，此函式會被 Chainlink 節點呼叫，然後它會將結果轉發給 DungeonMaster。
     */
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        require(address(dungeonMaster) != address(0), "VRF: DungeonMaster not set");
        dungeonMaster.processExpeditionResult(_requestId, _randomWords);
    }

    // --- Owner 管理函式 ---
    function setDungeonMaster(address _newAddress) external onlyOwner {
        dungeonMaster = IDungeonMaster(_newAddress);
        emit DungeonMasterSet(_newAddress);
    }

    function setCallbackGasLimit(uint32 _newLimit) external onlyOwner {
        callbackGasLimit = _newLimit;
    }

    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "VRF: Native withdraw failed");
    }
}
