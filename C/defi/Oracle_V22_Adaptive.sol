// contracts/defi/Oracle_V22_Adaptive.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/interfaces.sol";

// MulDiv 函式庫
library MulDiv {
    function mulDiv(
        uint256 a,
        uint256 b,
        uint256 denominator
    ) internal pure returns (uint256 result) {
        uint256 prod0; 
        uint256 prod1; 
        assembly {
            let mm := mulmod(a, b, not(0))
            prod0 := mul(a, b)
            prod1 := sub(mm, prod0)
            if lt(mm, prod0) {
                prod1 := sub(prod1, 1)
            }
        }

        if (prod1 == 0) {
            require(denominator > 0, "ZERO_DENOMINATOR");
            result = prod0 / denominator;
            return result;
        }

        require(denominator > prod1, "OVERFLOW");

        uint256 remainder;
        assembly {
            remainder := mulmod(a, b, denominator)
            prod0 := sub(prod0, remainder)
            prod1 := sub(prod1, mul(0, remainder))
            if lt(prod0, remainder) {
                prod1 := sub(prod1, 1)
            }
        }

        uint256 twos = (~denominator + 1) & denominator;
        assembly {
            denominator := div(denominator, twos)
        }
        assembly {
            prod0 := div(prod0, twos)
        }
        
        assembly {
            let inv := mul(3, denominator)
            inv := xor(inv, 2)
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            result := mul(prod0, inv)
        }
    }
}

// Uniswap V3 Tick 數學函式庫
library TickMath {
    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(int256(tick) * -1) : uint256(int256(tick));
        require(absTick <= 887272, "T");
        uint256 ratio = absTick & 0x1 != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001 : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825) >> 128;
        if (absTick & 0x2000 != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5) >> 128;
        if (absTick & 0x4000 != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9) >> 128;
        if (absTick & 0x20000 != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604) >> 128;
        if (absTick & 0x40000 != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98) >> 128;
        if (absTick & 0x80000 != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2) >> 128;
        if (tick > 0) ratio = type(uint256).max / ratio;
        sqrtPriceX96 = uint160((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
    }
}

/**
 * @title Oracle_V22_Adaptive
 * @notice DungeonDelvers Oracle V22 - 自適應 TWAP 版本
 * @dev 自動降級 TWAP 週期，確保始終能提供價格
 */
contract Oracle_V22_Adaptive is Ownable {
    using MulDiv for uint256;

    // ========== 狀態變數 ==========
    IUniswapV3Pool public immutable pool;
    address public immutable poolAddress;      
    address public immutable soulShardToken;   
    address public immutable usdToken;         
    address public immutable token0;           
    address public immutable token1;           
    bool private immutable isSoulShardToken0;  
    
    uint32 public twapPeriod;                  // 預設 TWAP 週期（向後兼容）
    uint32[] public adaptivePeriods;           // 自適應週期列表
    
    // ========== 事件 ==========
    event TwapPeriodUpdated(uint32 newTwapPeriod);
    event AdaptivePeriodsUpdated(uint32[] periods);
    event PriceQueried(uint32 usedPeriod, uint256 price);

    // ========== 構造函數 ==========
    constructor(
        address _poolAddress,
        address _soulShardTokenAddress,
        address _usdTokenAddress
    ) Ownable(msg.sender) {
        require(
            _poolAddress != address(0) && 
            _soulShardTokenAddress != address(0) && 
            _usdTokenAddress != address(0), 
            "Oracle: Zero address"
        );
        
        pool = IUniswapV3Pool(_poolAddress);
        poolAddress = _poolAddress;
        soulShardToken = _soulShardTokenAddress;
        usdToken = _usdTokenAddress;

        // 獲取並儲存 pool tokens
        address _token0 = pool.token0();
        address _token1 = pool.token1();
        token0 = _token0;
        token1 = _token1;
        
        // 驗證 pool tokens 匹配
        require(
            (_token0 == soulShardToken || _token0 == usdToken) &&
            (_token1 == soulShardToken || _token1 == usdToken),
            "Oracle: Pool tokens mismatch"
        );
        
        isSoulShardToken0 = (soulShardToken == _token0);
        twapPeriod = 1800; // 預設 30 分鐘
        
        // 初始化自適應週期：30分鐘、15分鐘、10分鐘、5分鐘
        adaptivePeriods = new uint32[](4);
        adaptivePeriods[0] = 1800;  // 30 分鐘
        adaptivePeriods[1] = 900;   // 15 分鐘
        adaptivePeriods[2] = 600;   // 10 分鐘
        adaptivePeriods[3] = 300;   // 5 分鐘
    }

    // ========== 核心價格函數（自適應版本）==========
    
    /**
     * @notice 使用自適應 TWAP 獲取價格
     * @dev 從最長週期開始嘗試，直到找到可用的週期
     * @return price 價格（18位小數）
     * @return usedPeriod 實際使用的週期
     */
    function getPriceAdaptive() public view returns (uint256 price, uint32 usedPeriod) {
        for (uint i = 0; i < adaptivePeriods.length; i++) {
            (bool success, uint256 adaptivePrice) = tryGetPriceWithPeriod(adaptivePeriods[i]);
            if (success) {
                return (adaptivePrice, adaptivePeriods[i]);
            }
        }
        revert("Oracle: No valid price available");
    }
    
    /**
     * @notice 嘗試使用特定週期獲取價格
     * @param period TWAP 週期
     * @return success 是否成功
     * @return price 價格（如果成功）
     */
    function tryGetPriceWithPeriod(uint32 period) internal view returns (bool success, uint256 price) {
        try pool.observe(_createPeriodsArray(period)) returns (
            int56[] memory tickCumulatives,
            uint160[] memory
        ) {
            int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
            int24 tick = int24(tickCumulativesDelta / int56(uint56(period)));
            
            uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
            uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);
            uint256 Q192 = 1 << 192;

            if (isSoulShardToken0) {
                price = ratioX192.mulDiv(1e18, Q192);
            } else {
                require(ratioX192 != 0, "Oracle: ZERO_PRICE");
                price = Q192.mulDiv(1e18, ratioX192);
            }
            
            return (true, price);
        } catch {
            return (false, 0);
        }
    }

    // ========== 向後兼容函數 ==========
    
    /**
     * @notice 獲取 SoulShard 相對於 USD 的價格（向後兼容）
     * @dev 使用自適應方式，但返回格式與 V21 相同
     */
    function getSoulShardPriceInUSD() public view returns (uint256 price) {
        (price, ) = getPriceAdaptive();
    }
    
    /**
     * @notice 公開函數：獲取當前價格（別名）
     */
    function getLatestPrice() public view returns (uint256) {
        return getSoulShardPriceInUSD();
    }

    /**
     * @notice 計算需要多少 SoulShard 來支付指定的 USD 金額
     */
    function getRequiredSoulShardAmount(uint256 usdAmount) public view returns (uint256 soulAmount) {
        uint256 soulShardPrice = getSoulShardPriceInUSD();
        require(soulShardPrice > 0, "Oracle: ZERO_PRICE");
        soulAmount = usdAmount.mulDiv(1e18, soulShardPrice);
    }

    /**
     * @notice 根據輸入的代幣和數量，計算出需要輸出的另一種代幣的數量
     */
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        require(tokenIn == soulShardToken || tokenIn == usdToken, "Oracle: Invalid input token");

        uint256 soulShardPrice = getSoulShardPriceInUSD();
        require(soulShardPrice > 0, "Oracle: ZERO_PRICE");

        if (tokenIn == soulShardToken) { 
            // SoulShard → USD: amount * price / 1e18
            amountOut = amountIn.mulDiv(soulShardPrice, 1e18);
        } else { 
            // USD → SoulShard: amount * 1e18 / price
            // Lowered threshold to allow smaller prices while maintaining overflow protection
            require(soulShardPrice >= 1, "Oracle: Price cannot be zero");
            amountOut = amountIn.mulDiv(1e18, soulShardPrice);
        }
    }

    // ========== V22 新增功能 ==========
    
    /**
     * @notice 測試所有週期的可用性
     * @return available 每個週期是否可用
     * @return prices 每個週期的價格（如果可用）
     */
    function testAllPeriods() external view returns (bool[] memory available, uint256[] memory prices) {
        available = new bool[](adaptivePeriods.length);
        prices = new uint256[](adaptivePeriods.length);
        
        for (uint i = 0; i < adaptivePeriods.length; i++) {
            (bool success, uint256 price) = tryGetPriceWithPeriod(adaptivePeriods[i]);
            available[i] = success;
            if (success) {
                prices[i] = price;
            }
        }
    }
    
    /**
     * @notice 獲取當前配置的自適應週期
     */
    function getAdaptivePeriods() external view returns (uint32[] memory) {
        return adaptivePeriods;
    }

    // ========== Getter 函數 ==========
    
    function soulToken() public view returns (address) {
        return soulShardToken;
    }

    // ========== 管理函數 ==========
    
    /**
     * @notice 設置 TWAP 週期（向後兼容）
     */
    function setTwapPeriod(uint32 _newTwapPeriod) external onlyOwner {
        require(_newTwapPeriod > 0, "Oracle: TWAP period must be > 0");
        twapPeriod = _newTwapPeriod;
        emit TwapPeriodUpdated(_newTwapPeriod);
    }
    
    /**
     * @notice 設置自適應週期列表
     * @param _periods 週期陣列，必須從大到小排序
     */
    function setAdaptivePeriods(uint32[] calldata _periods) external onlyOwner {
        require(_periods.length > 0 && _periods.length <= 10, "Oracle: Invalid periods length");
        
        // 驗證降序排列
        for (uint i = 1; i < _periods.length; i++) {
            require(_periods[i] < _periods[i-1], "Oracle: Periods must be descending");
            require(_periods[i] > 0, "Oracle: Invalid period");
        }
        
        adaptivePeriods = _periods;
        emit AdaptivePeriodsUpdated(_periods);
    }
    
    // ========== 內部輔助函數 ==========
    
    /**
     * @notice 創建週期陣列供 observe 使用
     */
    function _createPeriodsArray(uint32 period) private pure returns (uint32[] memory) {
        uint32[] memory periods = new uint32[](2);
        periods[0] = period;
        periods[1] = 0;
        return periods;
    }
}