// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PlayerVault is Ownable, ReentrancyGuard {
    IERC20 public immutable soulShardToken;

    struct PlayerInfo {
        uint256 withdrawableBalance;
        uint256 lastWithdrawTimestamp;
        bool isFirstWithdraw;
    }
    mapping(address => PlayerInfo) public playerInfo;
    mapping(address => address) public referrers;

    address public dungeonCoreAddress; // 修改為 DungeonCore

    // ... (省略事件和參數) ...

    modifier onlyDungeonCore() {
        require(msg.sender == dungeonCoreAddress, "Caller is not DungeonCore");
        _;
    }

    constructor(address _soulShardTokenAddress) {
        soulShardToken = IERC20(_soulShardTokenAddress);
    }

    function deposit(address _player, uint256 _amount) external onlyDungeonCore {
        // ... (與之前版本相同)
    }

    function withdraw(uint256 _amount) external nonReentrant {
        // ... (與之前版本相同)
    }

    // ... (省略其他函式) ...

    function setDungeonCoreAddress(address _address) external onlyOwner {
        dungeonCoreAddress = _address;
    }
}