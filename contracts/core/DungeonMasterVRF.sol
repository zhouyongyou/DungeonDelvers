// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDungeonMaster.sol";

// --- 錯誤定義 ---
error OnlyMainLogicContract();
error RequestAlreadyFulfilled();

/**
 * @title DungeonMasterVRF
 * @notice DungeonMaster 的 VRF 衛星合約。
 * @dev 此版本修正了繼承與建構函式，與 Chainlink v2.5 Wrapper 的標準實踐對齊。
 */
contract DungeonMasterVRF is VRFV2PlusWrapperConsumerBase, Ownable {
    address public mainLogicContract;

    // Mapping to store the request status
    mapping(uint256 => bool) public s_requestFulfilled;
    // Mapping to store the random words for each request
    mapping(uint256 => uint256[]) public s_randomWords;

    // VRF v2.5 Wrapper parameters
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    
    event MainLogicContractSet(address indexed logicContract);
    event RequestSent(uint256 indexed requestId, uint32 numWords);
    event RequestFulfilled(uint256 indexed requestId, uint256[] randomWords);

    /**
     * @dev 建構函式，與 Chainlink VRF Wrapper 的標準實踐一致。
     * @param _vrfWrapper The address of the VRF V2.5 Wrapper contract.
     * @param _initialOwner The initial owner of this contract.
     */
    constructor(
        address _vrfWrapper,
        address _initialOwner
    ) 
        VRFV2PlusWrapperConsumerBase(_vrfWrapper) 
        Ownable(_initialOwner) 
    {}

    /**
     * @dev 主邏輯合約呼叫此函式來請求隨機數。
     */
    function sendRequest(
        address _requester, // 雖然此處未使用，但為了與主合約介面保持一致而保留
        uint256 _partyId,    // 保留以符合介面
        uint256 _dungeonId   // 保留以符合介面
    ) external returns (uint256 requestId) {
        if (msg.sender != mainLogicContract) {
            revert OnlyMainLogicContract();
        }
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
        );
        // 每次遠征只需要一個隨機數
        (requestId, ) = requestRandomnessPayInNative(
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            1, 
            extraArgs
        );
        emit RequestSent(requestId, 1);
        return requestId;
    }

    /**
     * @dev VRF Coordinator 呼叫的回調函式，用以完成隨機數請求。
     */
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        if (s_requestFulfilled[_requestId]) {
            revert RequestAlreadyFulfilled();
        }
        s_requestFulfilled[_requestId] = true;
        s_randomWords[_requestId] = _randomWords;
        emit RequestFulfilled(_requestId, _randomWords);

        // 將結果直接轉發給主邏輯合約進行處理
        IDungeonMaster(mainLogicContract).processExpeditionResult(_requestId, _randomWords);
    }

    /**
     * @dev 允許擁有者設定主邏輯合約的地址。
     */
    function setMainLogicContract(address _logicContract) external onlyOwner {
        require(_logicContract != address(0), "Main logic contract cannot be zero address");
        mainLogicContract = _logicContract;
        emit MainLogicContractSet(_logicContract);
    }

    /**
     * @dev 允許擁有者提取合約中用於支付 VRF 費用的原生代幣（例如 BNB）。
     */
    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "VRF: Native withdraw failed");
    }
}
