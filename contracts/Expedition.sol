// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Interfaces.sol";

contract Expedition is Ownable, VRFV2PlusWrapperConsumerBase {
    
    address public dungeonCoreAddress;
    IParty public partyContract;
    IPlayerProfile public playerProfileContract;
    IVIPStaking public vipStakingContract;

    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint32 private s_callbackGasLimit = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    struct PartyStatus {
        uint256 provisionsRemaining;
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
    }

    struct ExpeditionRequest {
        address requester;
        uint256 partyId;
        uint256 dungeonId;
        uint256 requiredPower;
        uint256 rewardAmountUSD;
        uint8 baseSuccessRate;
    }

    mapping(uint256 => PartyStatus) public partyStatuses;
    mapping(uint256 => ExpeditionRequest) public s_requests;

    event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event ExpeditionRequested(uint256 indexed requestId, uint256 indexed partyId, uint256 indexed dungeonId);

    modifier onlyDungeonCore() {
        require(msg.sender == dungeonCoreAddress, "Caller is not DungeonCore");
        _;
    }

    constructor(address _vrfWrapper) VRFV2PlusWrapperConsumerBase(_vrfWrapper) Ownable(msg.sender) {}

    function requestExpedition(
        address _requester,
        uint256 _partyId,
        uint256 _dungeonId,
        uint256 _requiredPower,
        uint256 _rewardAmountUSD,
        uint8 _baseSuccessRate
    ) external onlyDungeonCore returns (uint256 requestId) {
        (, , uint256 totalPower, ) = partyContract.getPartyComposition(_partyId);
        require(totalPower >= _requiredPower, "Power too low");

        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (requestId, ) = requestRandomnessPayInNative(s_callbackGasLimit, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        
        s_requests[requestId] = ExpeditionRequest({
            requester: _requester,
            partyId: _partyId,
            dungeonId: _dungeonId,
            requiredPower: _requiredPower,
            rewardAmountUSD: _rewardAmountUSD,
            baseSuccessRate: _baseSuccessRate
        });
        emit ExpeditionRequested(requestId, _partyId, _dungeonId);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        ExpeditionRequest memory request = s_requests[_requestId];
        require(request.requester != address(0), "Request invalid");

        partyStatuses[request.partyId].cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;
        
        uint8 vipBonus = 0;
        if (address(vipStakingContract) != address(0)) {
            vipBonus = vipStakingContract.getVipSuccessBonus(request.requester);
        }
        uint256 finalSuccessRate = request.baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) {
            finalSuccessRate = 100;
        }

        bool success = (_randomWords[0] % 100) < finalSuccessRate;
        uint256 reward = 0;
        if (success) {
            reward = request.rewardAmountUSD; 
            partyStatuses[request.partyId].unclaimedRewards += reward;
        }

        uint256 expGained = calculateExperience(request.dungeonId, success);
        if (address(playerProfileContract) != address(0) && success) {
            address player = request.requester;
            if(playerProfileContract.profileTokenOf(player) == 0){
                playerProfileContract.mintProfile(player);
            }
            if (expGained > 0) {
                playerProfileContract.addExperience(player, expGained);
            }
        }
        
        emit ExpeditionFulfilled(_requestId, request.partyId, success, reward, expGained);
        delete s_requests[_requestId];
    }

    function isPartyLocked(uint256 _partyId) external view returns (bool) {
        PartyStatus storage status = partyStatuses[_partyId];
        return block.timestamp < status.cooldownEndsAt || status.provisionsRemaining > 0;
    }
    
    function calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 expGained;
        if (dungeonId >= 1 && dungeonId <= 10) {
            expGained = dungeonId * 10;
        } else {
            expGained = 0;
        }
        if (!success) {
            expGained = expGained * 40 / 100; // 40% of EXP on failure
        }
        return expGained;
    }

    function useProvision(uint256 _partyId) external onlyDungeonCore {
        require(partyStatuses[_partyId].provisionsRemaining > 0, "No provisions");
        partyStatuses[_partyId].provisionsRemaining--;
    }

    function addProvisions(uint256 _partyId, uint256 _amount) external onlyDungeonCore {
        partyStatuses[_partyId].provisionsRemaining += _amount;
    }

    function clearUnclaimedRewards(uint256 _partyId) external onlyDungeonCore returns (uint256) {
        uint256 rewards = partyStatuses[_partyId].unclaimedRewards;
        partyStatuses[_partyId].unclaimedRewards = 0;
        return rewards;
    }

    // --- Admin Functions ---
    function setDungeonCoreAddress(address _address) external onlyOwner {
        dungeonCoreAddress = _address;
    }
    function setPartyContract(address _address) external onlyOwner {
        partyContract = IParty(_address);
    }
    function setPlayerProfileContract(address _address) external onlyOwner {
        playerProfileContract = IPlayerProfile(_address);
    }
    function setVipStakingContract(address _address) external onlyOwner {
        vipStakingContract = IVIPStaking(_address);
    }
}