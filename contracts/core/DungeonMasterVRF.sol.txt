// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "../interfaces/IDungeonMaster.sol"; // 【修正】從引入完整合約，改為引入介面

/**
 * @title DungeonMasterVRF
 * @notice DungeonMaster 的 VRF 衛星合約，專門處理隨機數請求與回調。
 */
contract DungeonMasterVRF is VRFV2PlusWrapperConsumerBase, Ownable {
    IDungeonMaster public mainLogicContract; // 【修正】使用介面類型

    uint32 private s_callbackGasLimit = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    event VrfRequestSent(uint256 indexed requestId, address requester, uint256 partyId, uint256 dungeonId);

    modifier onlyMainLogic() {
        require(msg.sender == address(mainLogicContract), "VRF: Not main logic contract");
        _;
    }

    constructor(address _vrfWrapper, address _initialOwner)
        VRFV2PlusWrapperConsumerBase(_vrfWrapper)
        Ownable(_initialOwner)
    {}

    function setMainLogicContract(address _mainLogicAddress) external onlyOwner {
        mainLogicContract = IDungeonMaster(_mainLogicAddress);
    }

    /**
     * @dev 由主邏輯合約呼叫，以發起隨機數請求
     */
    function sendRequest(address _requester, uint256 _partyId, uint256 _dungeonId)
        external
        onlyMainLogic
        returns (uint256 requestId)
    {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (requestId, ) = requestRandomnessPayInNative(s_callbackGasLimit, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        emit VrfRequestSent(requestId, _requester, _partyId, _dungeonId);
        return requestId;
    }

    /**
     * @dev Chainlink VRF 的回調函式
     */
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        // 將結果直接轉發給主邏輯合約進行處理
        mainLogicContract.processExpeditionResult(_requestId, _randomWords);
    }
    
    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "VRF: Native withdraw failed");
    }
}
