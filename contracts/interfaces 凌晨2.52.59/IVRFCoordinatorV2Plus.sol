// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVRFCoordinatorV2Plus {
    function requestRandomWords(
        bytes32 keyHash,
        uint256 subId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
    
    function createSubscription() external returns (uint256 subId);
    
    function addConsumer(uint256 subId, address consumer) external;
    
    function removeConsumer(uint256 subId, address consumer) external;
    
    function getSubscription(uint256 subId) external view returns (
        uint96 balance,
        uint96 nativeBalance,
        uint64 reqCount,
        address owner,
        address[] memory consumers
    );
}