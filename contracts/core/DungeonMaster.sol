// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IParty.sol";
import "../interfaces/IPlayerProfile.sol";
import "../interfaces/IVIPStaking.sol";

contract DungeonMaster is Ownable, ReentrancyGuard, Pausable, VRFV2PlusWrapperConsumerBase {

    IPlayerVault public playerVault;
    IParty public partyContract;
    IPlayerProfile public playerProfileContract;
    IVIPStaking public vipStakingContract;

    struct Dungeon { uint256 requiredPower; uint256 rewardAmountUSD; uint8 baseSuccessRate; bool isInitialized; }
    struct PartyStatus { uint256 provisionsRemaining; uint256 cooldownEndsAt; }
    struct ExpeditionRequest { address requester; uint256 partyId; uint256 dungeonId; bool fulfilled; }
    
    mapping(uint256 => Dungeon) public dungeons;
    mapping(uint256 => PartyStatus) public partyStatuses;
    mapping(uint256 => ExpeditionRequest) public s_requests;

    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    
    // ... (您原有的事件、建構函式和 _initializeDungeons 函式)

    constructor(
        address _vrfWrapper,
        address _playerVault,
        address _party,
        address _playerProfile,
        address _vipStaking
    ) VRFV2PlusWrapperConsumerBase(_vrfWrapper) {
        playerVault = IPlayerVault(_playerVault);
        partyContract = IParty(_party);
        playerProfileContract = IPlayerProfile(_playerProfile);
        vipStakingContract = IVIPStaking(_vipStaking);
        _initializeDungeons();
    }
    
    function requestExpedition(uint256 _partyId, uint256 _dungeonId) external payable nonReentrant whenNotPaused returns (uint256 requestId) {
        // ... (遠征請求邏輯不變)
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        // ... (遠征結果處理邏輯不變)
        // ...
        // [修改] 成功時，呼叫 playerVault.deposit() 來存入獎勵
        if (success) {
            // ... (計算 reward)
            playerVault.deposit(request.requester, reward);
        }
        // ... (處理經驗值)
    }

    function isPartyLocked(uint256 _partyId) external view returns (bool) {
        PartyStatus storage status = partyStatuses[_partyId];
        return block.timestamp < status.cooldownEndsAt || status.provisionsRemaining > 0;
    }

    // ... (所有管理員函式)
}