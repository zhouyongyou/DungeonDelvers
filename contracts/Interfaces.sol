// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITreasury {
    function deposit(address _player, uint256 _amount) external;
    function withdraw(address _player, uint256 _amount) external;
    function payReferralCommission(address _player, uint256 _amount) external returns (uint256);
}

interface IExpedition {
    function requestExpedition(
        address _requester,
        uint256 _partyId,
        uint256 _dungeonId,
        uint256 _requiredPower,
        uint256 _rewardAmountUSD,
        uint8 _baseSuccessRate
    ) external returns (uint256 requestId);
    
    function useProvision(uint256 _partyId) external;
    function clearUnclaimedRewards(uint256 _partyId) external returns (uint256);
    function isPartyLocked(uint256 _partyId) external view returns (bool);
}

interface IReferral {
    function getReferrer(address _user) external view returns (address);
    function setReferrer(address _user, address _referrer) external;
}

interface IParty {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 _partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity);
}

interface IPlayerProfile {
    function profileTokenOf(address player) external view returns (uint256);
    function mintProfile(address player) external returns (uint256);
    function addExperience(address player, uint256 amount) external;
}

interface IVIPStaking {
    function getVipSuccessBonus(address _user) external view returns (uint8);
}

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}