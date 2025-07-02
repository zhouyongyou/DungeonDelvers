// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IAltarOfAscension.sol"; // 【修正】引入接口以使用共享的 Recipe 結構體

/**
 * @title AltarStorage (合成祭壇儲存合約)
 * @notice 為 AltarOfAscension 儲存所有狀態數據。
 */
contract AltarStorage is Ownable {
    address public logicContract;

    mapping(uint8 => Recipe) public upgradeRules;
    
    // 【修正】將 UpgradeRequest 的定義保留在此，因為它只被 AltarStorage 內部邏輯使用
    struct UpgradeRequestData {
        address player;
        address tokenContract;
        uint8 baseRarity;
    }
    mapping(uint256 => UpgradeRequestData) public s_requests;

    modifier onlyLogicContract() {
        require(msg.sender == logicContract, "Storage: Not authorized");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setLogicContract(address _logicContract) external onlyOwner {
        logicContract = _logicContract;
    }

    // --- Getters ---
    function getUpgradeRule(uint8 _rarity) external view returns (Recipe memory) {
        return upgradeRules[_rarity];
    }

    function getRequest(uint256 _requestId) external view returns (UpgradeRequestData memory) {
        return s_requests[_requestId];
    }

    // --- Setters (只能由邏輯合約呼叫) ---
    function setUpgradeRule(uint8 _rarity, Recipe calldata _rule) external onlyLogicContract {
        upgradeRules[_rarity] = _rule;
    }

    function setRequest(uint256 _requestId, UpgradeRequestData calldata _request) external onlyLogicContract {
        s_requests[_requestId] = _request;
    }

    function deleteRequest(uint256 _requestId) external onlyLogicContract {
        delete s_requests[_requestId];
    }
}
