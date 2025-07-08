// 調試版本 - 加入到你的 Oracle 合約中
function debugPrice() external view returns (
    uint256 ourPrice,
    uint256 currentSpotPrice, 
    bool soulShardIsToken0,
    address token0,
    address token1,
    uint8 token0Decimals,
    uint8 token1Decimals,
    uint160 sqrtRatioX96,
    uint256 ratioX192,
    string memory diagnosis
) {
    // 獲取我們的 TWAP 價格
    ourPrice = getSoulShardPriceInUSD();
    
    // 獲取當前瞬時價格對比
    (sqrtRatioX96, , , , , , ) = pool.slot0();
    ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);
    uint256 Q192 = 1 << 192;
    
    if (isSoulShardToken0) {
        currentSpotPrice = ratioX192.mulDiv(1e18, Q192);
    } else {
        currentSpotPrice = Q192.mulDiv(1e18, ratioX192);
    }
    
    // 獲取代幣信息
    soulShardIsToken0 = isSoulShardToken0;
    token0 = pool.token0();
    token1 = pool.token1();
    
    // 如果可以獲取小數位數
    try IERC20Metadata(token0).decimals() returns (uint8 dec0) {
        token0Decimals = dec0;
    } catch {
        token0Decimals = 255; // 錯誤標記
    }
    
    try IERC20Metadata(token1).decimals() returns (uint8 dec1) {
        token1Decimals = dec1;
    } catch {
        token1Decimals = 255; // 錯誤標記
    }
    
    // 診斷信息
    if (token0Decimals != token1Decimals && token0Decimals != 255 && token1Decimals != 255) {
        diagnosis = "DECIMAL_MISMATCH";
    } else if (ourPrice > currentSpotPrice * 2 || currentSpotPrice > ourPrice * 2) {
        diagnosis = "LARGE_TWAP_SPOT_DIFF";
    } else {
        diagnosis = "OK";
    }
}