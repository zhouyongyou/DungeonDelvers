// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

// --- 從 @openzeppelin/contracts/utils/Context.sol 開始 ---
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

// --- 從 @openzeppelin/contracts/access/Ownable.sol 開始 ---
abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor(address initialOwner) {
        _transferOwnership(initialOwner);
    }
    function owner() public view virtual returns (address) {
        return _owner;
    }
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// --- 從 @openzeppelin/contracts/token/ERC20/IERC20.sol 開始 ---
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// --- 從 @openzeppelin/contracts/utils/introspection/IERC165.sol 開始 ---
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// --- 從 @openzeppelin/contracts/token/ERC1155/IERC1155.sol 開始 ---
interface IERC1155 is IERC165 {
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external;
}

// --- 從 @openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol 開始 ---
interface IERC1155Receiver is IERC165 {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}

// --- 從 @openzeppelin/contracts/utils/introspection/ERC165.sol 開始 ---
abstract contract ERC165 is IERC165 {
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

// --- 從 @openzeppelin/contracts/token/ERC1155/ERC1155.sol 開始 ---
contract ERC1155 is Context, ERC165, IERC1155 {
    mapping(uint256 => mapping(address => uint256)) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    string private _uri;
    constructor(string memory uri_) {
        _setURI(uri_);
    }
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IERC1155).interfaceId || super.supportsInterface(interfaceId);
    }
    function uri(uint256) public view virtual returns (string memory) {
        return _uri;
    }
    function balanceOf(address account, uint256 id) public view virtual override returns (uint256) {
        require(account != address(0), "ERC1155: address zero is not a valid owner");
        return _balances[id][account];
    }
    function balanceOfBatch(address[] memory accounts, uint256[] memory ids) public view virtual override returns (uint256[] memory) {
        require(accounts.length == ids.length, "ERC1155: accounts and ids length mismatch");
        uint256[] memory batchBalances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }
        return batchBalances;
    }
    function setApprovalForAll(address operator, bool approved) public virtual override {
        _setApprovalForAll(operator, approved);
    }
    function _setApprovalForAll(address operator, bool approved) internal virtual {
        require(operator != address(0), "ERC1155: set Approval for all operator cannot be 0x0"); // 檢查 operator 地址是否為零地址
        _operatorApprovals[address(this)][operator] = approved; // 設置 operator 的批准狀態
    }
    function isApprovedForAll(address account, address operator) public view virtual override returns (bool) {
        return _operatorApprovals[account][operator];
    }
    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(account) }
        return size > 0;
    }
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) public virtual override {
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "ERC1155: caller is not owner nor approved");
        _safeTransferFrom(from, to, id, amount, data);
    }
    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public virtual override {
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "ERC1155: caller is not owner nor approved");
        _safeBatchTransferFrom(from, to, ids, amounts, data);
    }
    function _safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) internal virtual {
        require(to != address(0), "ERC1155: transfer to the zero address");
        address operator = _msgSender();
        uint256 fromBalance = _balances[id][from];
        require(fromBalance >= amount, "ERC1155: insufficient balance for transfer");
        unchecked {
            _balances[id][from] = fromBalance - amount;
        }
        _balances[id][to] += amount;
        emit TransferSingle(operator, from, to, id, amount);
        if (isContract(to)) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 response) {
                require(response == IERC1155Receiver.onERC1155Received.selector, "ERC1155: receiver rejected tokens");
            } catch {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            }
        }
    }
    function _safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) internal virtual {
        require(ids.length == amounts.length, "ERC1155: ids and amounts length mismatch");
        require(to != address(0), "ERC1155: transfer to the zero address");
        address operator = _msgSender();
        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            uint256 fromBalance = _balances[id][from];
            require(fromBalance >= amount, "ERC1155: insufficient balance for transfer");
            unchecked {
                _balances[id][from] = fromBalance - amount;
            }
            _balances[id][to] += amount;
        }
        emit TransferBatch(operator, from, to, ids, amounts);
        if (isContract(to)) {
            try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data) returns (bytes4 response) {
                require(response == IERC1155Receiver.onERC1155BatchReceived.selector, "ERC1155: receiver rejected tokens");
            } catch {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            }
        }
    }
    function _setURI(string memory newuri) internal virtual {
        _uri = newuri;
    }
    function _mint(address to, uint256 id, uint256 amount, bytes memory /*data*/) internal virtual {
        require(to != address(0), "ERC1155: mint to the zero address");
        address operator = _msgSender();
        _balances[id][to] += amount;
        emit TransferSingle(operator, address(0), to, id, amount);
    }
    function _burn(address from, uint256 id, uint256 amount) internal virtual {
        require(from != address(0), "ERC1155: burn from the zero address");
        address operator = _msgSender();
        uint256 fromBalance = _balances[id][from];
        require(fromBalance >= amount, "ERC1155: insufficient balance for burn");
        unchecked {
            _balances[id][from] = fromBalance - amount;
        }
        emit TransferSingle(operator, from, address(0), id, amount);
    }
}

// --- 從 @chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol 開始 ---
interface VRFCoordinatorV2Interface {
  function requestRandomWords(bytes32 keyHash, uint64 subId, uint16 requestConfirmations, uint32 callbackGasLimit, uint32 numWords) external returns (uint256 requestId);
}

// --- 從 @chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol 開始 ---
abstract contract VRFConsumerBaseV2 is IERC165 {
  error OnlyCoordinatorCanFulfill(address have, address want);
  VRFCoordinatorV2Interface internal vrfCoordinator;
  constructor(address vrfCoordinatorV2) {
    vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
  }
  function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual;
  function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
    if (msg.sender != address(vrfCoordinator)) {
      revert OnlyCoordinatorCanFulfill(msg.sender, address(vrfCoordinator));
    }
    fulfillRandomWords(requestId, randomWords);
  }
  function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165) returns (bool) {
    if (interfaceId == type(VRFConsumerBaseV2).interfaceId) {
      return true;
    }
    return false; // 默認不支援其他接口
  }
}

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

contract DungeonDelversAssets is ERC1155, Ownable, VRFConsumerBaseV2 {
    uint256 public constant COMMON_HERO = 1;
    uint256 public constant UNCOMMON_HERO = 2;
    uint256 public constant RARE_HERO = 3;
    uint256 public constant EPIC_HERO = 4;
    uint256 public constant LEGENDARY_HERO = 5;
    uint256 public constant COMMON_RELIC = 11;
    uint256 public constant UNCOMMON_RELIC = 12;
    uint256 public constant RARE_RELIC = 13;
    uint256 public constant EPIC_RELIC = 14;
    uint256 public constant LEGENDARY_RELIC = 15;

    IERC20 public soulShardToken;
    IPancakePair public soulShardUsdPair;
    address public usdToken;
    uint64 public subscriptionId;
    bytes32 public keyHash;

    uint256 public heroMintPriceUSD = 2 * 10**18;
    uint256 public relicMintPriceUSD = 2 * 10**18;
    uint256 private s_tokenCounter;

    VRFCoordinatorV2Interface private _vrfCoordinator;
    uint32 private constant CALLBACK_GAS_LIMIT = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    enum RequestType { Hero, Relic }
    struct RequestStatus { address requester; RequestType requestType; }
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(uint256 => uint256) public nftPower;
    mapping(uint256 => uint256) public nftCapacity;
    mapping(uint256 => uint256) public nftType;

    event ConfigAddressUpdated(string indexed name, address indexed newAddress);
    event VrfConfigUpdated(uint64 newSubscriptionId, bytes32 newKeyHash);
    event MintPriceUpdated(uint256 newHeroPriceUSD, uint256 newRelicPriceUSD);
    event MintRequested(uint256 indexed requestId, address indexed requester, RequestType requestType);
    event MintFulfilled(uint256 indexed requestId, uint256 indexed tokenId, uint256 tokenType, uint256 powerOrCapacity);

    constructor(
        address _initialOwner,
        string memory _uri,
        address _soulShardTokenAddress,
        address _usdTokenAddress,
        address _pairAddress,
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) 
    ERC1155(_uri) 
    Ownable(_initialOwner) 
    VRFConsumerBaseV2(_vrfCoordinatorV2) 
    {
        soulShardToken = IERC20(_soulShardTokenAddress);
        usdToken = _usdTokenAddress;
        soulShardUsdPair = IPancakePair(_pairAddress);
        _vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    // 覆蓋 supportsInterface 函數來解決多重繼承中的衝突
    function supportsInterface(bytes4 interfaceId) public pure override(ERC1155, VRFConsumerBaseV2) returns (bool) {
        if (interfaceId == type(IERC1155).interfaceId) {
            return true;  // 支援 ERC1155 接口
        }
        if (interfaceId == type(VRFConsumerBaseV2).interfaceId) {
            return true;  // 支援 VRFConsumerBaseV2 接口
        }
        return false;  // 默認不支援
    }

    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = soulShardUsdPair.getReserves();
        address token0 = soulShardUsdPair.token0();
        (uint reserveSoulShard, uint reserveUSD) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) 
            : (reserve1, reserve0);
        require(reserveSoulShard > 0 && reserveUSD > 0, "Invalid Reserve Quantity");
        return ((_amountUSD * reserveSoulShard * 1000) / (reserveUSD * 997)) + 1;
    }
    
    function requestNewHero(uint256 _maxAmountIn) public {
        uint256 requiredAmount = getSoulShardAmountForUSD(heroMintPriceUSD);
        require(_maxAmountIn >= requiredAmount, "Slippage Protection: The price has changed, the required tokens are too much.");
        soulShardToken.transferFrom(msg.sender, address(this), requiredAmount);
        _requestRandomness(RequestType.Hero);
    }
    
    function requestNewRelic(uint256 _maxAmountIn) public {
        uint256 requiredAmount = getSoulShardAmountForUSD(relicMintPriceUSD);
        require(_maxAmountIn >= requiredAmount, "Slippage protection: The price has changed, the required tokens are too much.");
        soulShardToken.transferFrom(msg.sender, address(this), requiredAmount);
        _requestRandomness(RequestType.Relic);
    }

    function _requestRandomness(RequestType _requestType) private {
        uint256 requestId = _vrfCoordinator.requestRandomWords(keyHash, subscriptionId, REQUEST_CONFIRMATIONS, CALLBACK_GAS_LIMIT, NUM_WORDS);
        s_requests[requestId] = RequestStatus({ requester: msg.sender, requestType: _requestType });
        emit MintRequested(requestId, msg.sender, _requestType);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus memory request = s_requests[_requestId];
        require(request.requester != address(0), "Request does not exist.");
        delete s_requests[_requestId]; 
        uint256 randomNumber = _randomWords[0];
        if (request.requestType == RequestType.Hero) {
            _generateAndMintHero(request.requester, randomNumber, _requestId);
        } else {
            _generateAndMintRelic(request.requester, randomNumber, _requestId);
        }
    }

    function _generateAndMintHero(address _to, uint256 _randomNumber, uint256 _requestId) private {
        uint256 rarityRoll = _randomNumber % 100;
        uint256 powerRoll = _randomNumber >> 8; 
        uint256 tokenTypeToMint;
        uint256 power;
        if (rarityRoll < 44) { tokenTypeToMint = COMMON_HERO; power = 15 + (powerRoll % 36); } 
        else if (rarityRoll < 79) { tokenTypeToMint = UNCOMMON_HERO; power = 50 + (powerRoll % 51); } 
        else if (rarityRoll < 94) { tokenTypeToMint = RARE_HERO; power = 100 + (powerRoll % 51); } 
        else if (rarityRoll < 99) { tokenTypeToMint = EPIC_HERO; power = 150 + (powerRoll % 51); } 
        else { tokenTypeToMint = LEGENDARY_HERO; power = 200 + (powerRoll % 56); }
        s_tokenCounter++;
        uint256 newTokenId = s_tokenCounter;
        nftPower[newTokenId] = power;
        nftType[newTokenId] = tokenTypeToMint;
        _mint(_to, newTokenId, 1, "");
        emit MintFulfilled(_requestId, newTokenId, tokenTypeToMint, power);
    }

    function _generateAndMintRelic(address _to, uint256 _randomNumber, uint256 _requestId) private {
        uint256 rarityRoll = _randomNumber % 100;
        uint256 tokenTypeToMint;
        uint256 capacity;
        if (rarityRoll < 44) { tokenTypeToMint = COMMON_RELIC; capacity = 1; } 
        else if (rarityRoll < 79) { tokenTypeToMint = UNCOMMON_RELIC; capacity = 2; } 
        else if (rarityRoll < 94) { tokenTypeToMint = RARE_RELIC; capacity = 3; } 
        else if (rarityRoll < 99) { tokenTypeToMint = EPIC_RELIC; capacity = 4; } 
        else { tokenTypeToMint = LEGENDARY_RELIC; capacity = 5; }
        s_tokenCounter++;
        uint256 newTokenId = s_tokenCounter;
        nftCapacity[newTokenId] = capacity;
        nftType[newTokenId] = tokenTypeToMint;
        _mint(_to, newTokenId, 1, "");
        emit MintFulfilled(_requestId, newTokenId, tokenTypeToMint, capacity);
    }

    function setMintPriceUSD(uint256 _newHeroPriceUSD, uint256 _newRelicPriceUSD) public onlyOwner {
        heroMintPriceUSD = _newHeroPriceUSD;
        relicMintPriceUSD = _newRelicPriceUSD;
        emit MintPriceUpdated(_newHeroPriceUSD, _newRelicPriceUSD);
    }
    
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }
    
    function setTokenAddresses(address _newSoulShardToken, address _newUsdToken) public onlyOwner {
        require(_newSoulShardToken != address(0) && _newUsdToken != address(0), "Address cannot be zero.");
        soulShardToken = IERC20(_newSoulShardToken);
        usdToken = _newUsdToken;
        emit ConfigAddressUpdated("SoulShardToken", _newSoulShardToken);
        emit ConfigAddressUpdated("UsdToken", _newUsdToken);
    }

    function setPairAddress(address _newPairAddress) public onlyOwner {
        soulShardUsdPair = IPancakePair(_newPairAddress);
        emit ConfigAddressUpdated("PairAddress", _newPairAddress);
    }

    function setVrfConfig(uint64 _newSubscriptionId, bytes32 _newKeyHash) public onlyOwner {
        subscriptionId = _newSubscriptionId;
        keyHash = _newKeyHash;
        emit VrfConfigUpdated(_newSubscriptionId, _newKeyHash);
    }
    
    function withdrawTokens(address _to) public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(balance > 0, "No tokens available to withdraw from the contract.");
        soulShardToken.transfer(_to, balance);
    }

    function getTokenProperties(uint256 _tokenId) public view returns (uint256, uint256, uint256) {
        return (nftType[_tokenId], nftPower[_tokenId], nftCapacity[_tokenId]);
    }
}
