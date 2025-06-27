// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}
library FixedPoint96 {
    uint256 internal constant Q96 = 0x1000000000000000000000000;
}

library TickMath {
    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= 887272, 'T');

        uint256 ratio = absTick & 0x1 != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001 : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c36248dc02da379) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c75d6ced848f39ebf43a425644) >> 128;
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
        sqrtPriceX96 = uint160(ratio);
    }
}

library OracleLibrary {
    function consult(address pool, uint32 period) internal view returns (int24 tick) {
        require(period != 0, 'BP');

        uint32[] memory periods = new uint32[](2);
        periods[0] = period;
        periods[1] = 0;

        (int56[] memory tickCumulatives, ) = IUniswapV3Pool(pool).observe(periods);
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];

        tick = int24(tickCumulativesDelta / int56(uint56(period)));
    }

    function getQuoteAtTick(
        int24 tick,
        uint128 baseAmount,
        address baseToken,
        address quoteToken
    ) internal pure returns (uint256 quoteAmount) {
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
        uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);
        
        if (baseToken < quoteToken) {
            quoteAmount = (uint256(baseAmount) * ratioX192) >> 192;
        } else {
            quoteAmount = (uint256(baseAmount) * FixedPoint96.Q96) / (ratioX192 / FixedPoint96.Q96);
        }
    }
}
contract Relic is ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable {
    string private _baseURIStorage;
    uint32 private constant CALLBACK_GAS_LIMIT = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    struct RequestStatus { bool fulfilled; }
    mapping(uint256 => RequestStatus) public s_requests;
    struct RelicProperties { uint8 rarity; uint8 capacity; }
    mapping(uint256 => RelicProperties) public relicProperties;
    uint256 private s_tokenCounter;
    IERC20 public immutable soulShardToken;
    IUniswapV3Pool public immutable soulShardUsdPool; // V3 的池子地址
    uint32 public constant TWAP_PERIOD = 1800; // 30 分鐘 TWAP
    address public immutable usdToken;
    uint256 public mintPriceUSD = 2 * 10**18;
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 300; 
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    address public ascensionAltarAddress;
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event AdminRelicMinted(address indexed to, uint256 indexed tokenId, uint8 rarity, uint8 capacity);
    event BatchRelicMinted(address indexed to, uint256 count);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event BlockMintLimitChanged(uint256 newLimit);
    constructor(
        address _vrfWrapper,
        address _soulShardTokenAddress,
        address _usdTokenAddress,
        address _soulShardUsdPoolAddress 
    ) 
        ERC721("Dungeon Delvers Relic", "DDR") 
        Ownable(msg.sender) 
        VRFV2PlusWrapperConsumerBase(_vrfWrapper) 
    {
        soulShardToken = IERC20(_soulShardTokenAddress);
        soulShardUsdPool = IUniswapV3Pool(_soulShardUsdPoolAddress);
        usdToken = _usdTokenAddress;
        // 初始化一個偽隨機種子，建議部署後立即透過 VRF 更新一次: updateSeasonSeedByOwner
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }
    function mintSingle() external payable nonReentrant whenNotPaused{
        _handleMinting(1);
    }
    function mintBatch(uint256 _count) external payable nonReentrant whenNotPaused{
        require(_count >= 5 && _count <= 20, "Batch count must be between 5 and 20");
        _handleMinting(_count);
        _requestNewSeasonSeed();
    }
    function _handleMinting(uint256 _count) private {
        _updateAndCheckBlockLimit(_count);
        _payMintFee(_count);
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(msg.sender, i);
        }
        if (_count > 1) {
            emit BatchRelicMinted(msg.sender, _count);
        }
    }
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus storage request = s_requests[_requestId];
        require(!request.fulfilled, "Request invalid or fulfilled");
        request.fulfilled = true;
        seasonSeed = _randomWords[0];
        emit SeasonSeedUpdated(seasonSeed, _requestId);
    }
    function _requestNewSeasonSeed() private {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (uint256 requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        s_requests[requestId] = RequestStatus({fulfilled: false});
    }
    function adminMint(address _to, uint8 _rarity, uint8 _capacity) public onlyOwner {
        _mintRelic(_to, _rarity, _capacity);
        emit AdminRelicMinted(_to, s_tokenCounter, _rarity, _capacity);
    }
    function adminBatchMint(address _to, uint256[5] calldata _counts) public onlyOwner {
        uint256 totalMintCount = 0;
        for (uint i = 0; i < _counts.length; i++) { totalMintCount += _counts[i]; }
        require(totalMintCount > 0 && totalMintCount <= 20, "Batch too large");

        for (uint8 rarity = 1; rarity <= 5; rarity++) {
            uint256 count = _counts[rarity - 1];
            if (count > 0) {
                for (uint256 i = 0; i < count; i++) {
                    uint8 capacity = _generateRelicCapacityByRarity(rarity);
                    _mintRelic(_to, rarity, capacity);
                }
            }
        }
    }
    function _payMintFee(uint256 _quantity) private {
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        uint256 requiredSoulShard = getSoulShardAmountForUSD(totalCostUSD);
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard), "Token transfer failed");
    }
    
    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity) private {
        uint256 newTokenId = ++s_tokenCounter;
        relicProperties[newTokenId] = RelicProperties({rarity: _rarity, capacity: _capacity});
        _safeMint(_to, newTokenId);
        emit RelicMinted(newTokenId, _to, _rarity, _capacity);
    }
    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(seasonSeed, block.prevrandao, msg.sender, _salt)));
        (uint8 rarity, uint8 capacity) = _calculateAttributes(pseudoRandom);
        _mintRelic(_to, rarity, capacity);
    }
    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.transfer(owner(), balance);
    }
    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint8 capacity) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44)      { rarity = 1; }
        else if (rarityRoll < 79) { rarity = 2; }
        else if (rarityRoll < 94) { rarity = 3; }
        else if (rarityRoll < 99) { rarity = 4; }
        else                      { rarity = 5; }
        capacity = _generateRelicCapacityByRarity(rarity);
    }
    function _generateRelicCapacityByRarity(uint8 _rarity) private pure returns (uint8 capacity) {
        require(_rarity >= 1 && _rarity <= 5, "Invalid rarity");
        return _rarity;
    }
    
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256 amountSoulShard) {
        int24 tick = OracleLibrary.consult(address(soulShardUsdPool), TWAP_PERIOD);
        address token0 = soulShardUsdPool.token0();
        address token1 = soulShardUsdPool.token1();
        amountSoulShard = OracleLibrary.getQuoteAtTick(tick, uint128(_amountUSD), token1, token0);
    }
    function withdrawNative() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    function getRelicProperties(uint256 _tokenId) public view returns (RelicProperties memory) {
        return relicProperties[_tokenId];
    }
    function setMintPriceUSD(uint256 _newMintPriceUSD) public onlyOwner { mintPriceUSD = _newMintPriceUSD; }
    function _baseURI() internal view override returns (string memory) {
        return _baseURIStorage;
    }
    function setBaseURI(string memory newBaseURI) public onlyOwner { _baseURIStorage = newBaseURI; }
    receive() external payable {}
    function _updateAndCheckBlockLimit(uint256 _count) private {
        if (block.number == lastMintBlock) {
            mintsInCurrentBlock += _count;
        } else {
            lastMintBlock = block.number;
            mintsInCurrentBlock = _count;
        }
        require(mintsInCurrentBlock <= blockMintLimit, "Mint limit for this block exceeded");
    }
    function setBlockMintLimit(uint256 _newLimit) public onlyOwner {
        blockMintLimit = _newLimit;
        emit BlockMintLimitChanged(_newLimit);
    }
    function updateSeasonSeedByOwner() public onlyOwner {
        _requestNewSeasonSeed();
    }
    function pause() public onlyOwner {
        _pause();
    }
    function unpause() public onlyOwner {
        _unpause();
    }
    function setAscensionAltarAddress(address _altarAddress) public onlyOwner {
        ascensionAltarAddress = _altarAddress;
    }
    function mintFromAltar(address _to, uint8 _rarity, uint8 _capacity) external {
        require(msg.sender == ascensionAltarAddress, "Caller is not the authorized Altar");
        _mintRelic(_to, _rarity, _capacity);
    }
    function burnFromAltar(uint256 tokenId) external {
        require(msg.sender == ascensionAltarAddress, "Caller is not the authorized Altar");
        // 呼叫 OpenZeppelin 的 _burn，這會檢查 token 是否存在
        _burn(tokenId); 
    }
}