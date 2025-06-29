// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Referral is Ownable {
    mapping(address => address) public referrers;
    address public dungeonCoreAddress;

    event ReferralSet(address indexed user, address indexed referrer);
    event DungeonCoreAddressUpdated(address indexed newAddress);

    modifier onlyDungeonCore() {
        require(msg.sender == dungeonCoreAddress, "Caller is not DungeonCore");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setReferrer(address _user, address _referrer) external onlyDungeonCore {
        require(referrers[_user] == address(0), "Referrer already set");
        require(_referrer != _user, "Cannot refer yourself");
        require(_referrer != address(0), "Referrer cannot be zero address");
        referrers[_user] = _referrer;
        emit ReferralSet(_user, _referrer);
    }

    function getReferrer(address _user) external view returns (address) {
        return referrers[_user];
    }

    function setDungeonCoreAddress(address _address) external onlyOwner {
        dungeonCoreAddress = _address;
        emit DungeonCoreAddressUpdated(_address);
    }
}