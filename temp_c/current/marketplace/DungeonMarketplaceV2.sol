// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DungeonMarketplaceV2
 * @dev Multi-currency P2P NFT marketplace for DungeonDelvers game assets
 * @notice Supports USDT, BUSD, USD1 and other stablecoins for trading
 */
contract DungeonMarketplaceV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =================================================================
    // State Variables
    // =================================================================
    
    uint256 private _listingIds;
    
    // Platform fees (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFee = 250;
    uint256 public constant MAX_FEE = 1000; // 10% maximum
    
    address public feeRecipient;
    
    // Supported payment tokens
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;
    
    // NFT contracts
    mapping(address => bool) public approvedNFTContracts;
    
    // =================================================================
    // Data Structures
    // =================================================================
    
    enum NFTType {
        HERO,
        RELIC,
        PARTY
    }
    
    enum ListingStatus {
        ACTIVE,
        SOLD,
        CANCELLED
    }
    
    struct Listing {
        uint256 id;
        address seller;
        NFTType nftType;
        address nftContract;
        uint256 tokenId;
        uint256 price;              // Price in USD (18 decimals)
        address[] acceptedTokens;   // Which tokens seller accepts
        ListingStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // Mappings
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256[]) public userListings;
    
    // =================================================================
    // Events
    // =================================================================
    
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        NFTType nftType,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address[] acceptedTokens
    );
    
    event ListingSold(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        address paymentToken,
        uint256 price,
        uint256 platformFeeAmount
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller
    );
    
    event ListingPriceUpdated(
        uint256 indexed listingId,
        uint256 oldPrice,
        uint256 newPrice
    );
    
    event ListingTokensUpdated(
        uint256 indexed listingId,
        address[] newAcceptedTokens
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event PaymentTokenAdded(address token);
    event PaymentTokenRemoved(address token);
    event NFTContractApproved(address nftContract);
    event NFTContractRevoked(address nftContract);
    
    // =================================================================
    // Constructor
    // =================================================================
    
    constructor(
        address _feeRecipient,
        address[] memory _supportedTokens,
        address[] memory _nftContracts
    ) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        feeRecipient = _feeRecipient;
        
        // Initialize supported payment tokens
        for (uint i = 0; i < _supportedTokens.length; i++) {
            require(_supportedTokens[i] != address(0), "Invalid token address");
            supportedTokens[_supportedTokens[i]] = true;
            tokenList.push(_supportedTokens[i]);
            emit PaymentTokenAdded(_supportedTokens[i]);
        }
        
        // Initialize approved NFT contracts
        for (uint i = 0; i < _nftContracts.length; i++) {
            require(_nftContracts[i] != address(0), "Invalid NFT contract");
            approvedNFTContracts[_nftContracts[i]] = true;
            emit NFTContractApproved(_nftContracts[i]);
        }
    }
    
    // =================================================================
    // Core Functions
    // =================================================================
    
    /**
     * @dev Create a new listing
     * @param nftType Type of NFT (Hero, Relic, or Party)
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID of the NFT
     * @param price Price in USD (18 decimals)
     * @param acceptedTokens Array of payment tokens seller accepts
     */
    function createListing(
        NFTType nftType,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address[] calldata acceptedTokens
    ) external nonReentrant {
        require(approvedNFTContracts[nftContract], "NFT contract not approved");
        require(price > 0, "Price must be greater than 0");
        require(acceptedTokens.length > 0, "Must accept at least one token");
        
        // Verify all accepted tokens are supported
        for (uint i = 0; i < acceptedTokens.length; i++) {
            require(supportedTokens[acceptedTokens[i]], "Token not supported");
        }
        
        // Verify ownership and get approval
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        
        _listingIds++;
        uint256 listingId = _listingIds;
        
        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            nftType: nftType,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            acceptedTokens: acceptedTokens,
            status: ListingStatus.ACTIVE,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        userListings[msg.sender].push(listingId);
        
        emit ListingCreated(
            listingId,
            msg.sender,
            nftType,
            nftContract,
            tokenId,
            price,
            acceptedTokens
        );
    }
    
    /**
     * @dev Purchase an NFT with specified payment token
     * @param listingId ID of the listing
     * @param paymentToken Token to use for payment
     */
    function purchaseNFT(
        uint256 listingId,
        address paymentToken
    ) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy own listing");
        
        // Check if payment token is accepted by seller
        bool tokenAccepted = false;
        for (uint i = 0; i < listing.acceptedTokens.length; i++) {
            if (listing.acceptedTokens[i] == paymentToken) {
                tokenAccepted = true;
                break;
            }
        }
        require(tokenAccepted, "Payment token not accepted");
        
        uint256 price = listing.price;
        uint256 feeAmount = (price * platformFee) / 10000;
        uint256 sellerAmount = price - feeAmount;
        
        // Transfer payment
        IERC20 token = IERC20(paymentToken);
        token.safeTransferFrom(msg.sender, listing.seller, sellerAmount);
        if (feeAmount > 0) {
            token.safeTransferFrom(msg.sender, feeRecipient, feeAmount);
        }
        
        // Transfer NFT
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );
        
        // Update listing status
        listing.status = ListingStatus.SOLD;
        listing.updatedAt = block.timestamp;
        
        emit ListingSold(
            listingId,
            listing.seller,
            msg.sender,
            paymentToken,
            price,
            feeAmount
        );
    }
    
    /**
     * @dev Cancel a listing
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        
        listing.status = ListingStatus.CANCELLED;
        listing.updatedAt = block.timestamp;
        
        emit ListingCancelled(listingId, msg.sender);
    }
    
    /**
     * @dev Update listing price
     * @param listingId ID of the listing
     * @param newPrice New price in USD (18 decimals)
     */
    function updateListingPrice(uint256 listingId, uint256 newPrice) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(newPrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = listing.price;
        listing.price = newPrice;
        listing.updatedAt = block.timestamp;
        
        emit ListingPriceUpdated(listingId, oldPrice, newPrice);
    }
    
    /**
     * @dev Update accepted payment tokens for a listing
     * @param listingId ID of the listing
     * @param newAcceptedTokens New array of accepted tokens
     */
    function updateListingTokens(
        uint256 listingId, 
        address[] calldata newAcceptedTokens
    ) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(newAcceptedTokens.length > 0, "Must accept at least one token");
        
        // Verify all tokens are supported
        for (uint i = 0; i < newAcceptedTokens.length; i++) {
            require(supportedTokens[newAcceptedTokens[i]], "Token not supported");
        }
        
        listing.acceptedTokens = newAcceptedTokens;
        listing.updatedAt = block.timestamp;
        
        emit ListingTokensUpdated(listingId, newAcceptedTokens);
    }
    
    // =================================================================
    // View Functions
    // =================================================================
    
    /**
     * @dev Get current listing ID counter
     * @return Current listing ID
     */
    function getCurrentListingId() external view returns (uint256) {
        return _listingIds;
    }
    
    /**
     * @dev Check if a listing is active and valid
     * @param listingId ID of the listing
     * @return isActive Whether the listing is active
     */
    function isListingActive(uint256 listingId) external view returns (bool) {
        Listing memory listing = listings[listingId];
        if (listing.status != ListingStatus.ACTIVE) return false;
        
        // Verify NFT is still owned by seller and approved
        try IERC721(listing.nftContract).ownerOf(listing.tokenId) returns (address owner) {
            if (owner != listing.seller) return false;
            
            IERC721 nft = IERC721(listing.nftContract);
            return nft.isApprovedForAll(listing.seller, address(this)) || 
                   nft.getApproved(listing.tokenId) == address(this);
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Get user's listing IDs
     * @param user Address of the user
     * @return Array of listing IDs
     */
    function getUserListings(address user) external view returns (uint256[] memory) {
        return userListings[user];
    }
    
    /**
     * @dev Get all supported payment tokens
     * @return Array of token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }
    
    /**
     * @dev Get accepted tokens for a listing
     * @param listingId ID of the listing
     * @return Array of accepted token addresses
     */
    function getListingAcceptedTokens(uint256 listingId) external view returns (address[] memory) {
        return listings[listingId].acceptedTokens;
    }
    
    // =================================================================
    // Admin Functions
    // =================================================================
    
    /**
     * @dev Add a new supported payment token
     * @param token Address of the token to add
     */
    function addPaymentToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        tokenList.push(token);
        
        emit PaymentTokenAdded(token);
    }
    
    /**
     * @dev Remove a supported payment token
     * @param token Address of the token to remove
     */
    function removePaymentToken(address token) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        
        supportedTokens[token] = false;
        
        // Remove from tokenList array
        for (uint i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        
        emit PaymentTokenRemoved(token);
    }
    
    /**
     * @dev Update platform fee
     * @param newFee New fee in basis points
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee too high");
        uint256 oldFee = platformFee;
        platformFee = newFee;
        emit PlatformFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @dev Update fee recipient
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }
    
    /**
     * @dev Approve an NFT contract for trading
     * @param nftContract Address of the NFT contract
     */
    function approveNFTContract(address nftContract) external onlyOwner {
        require(nftContract != address(0), "Invalid contract");
        require(!approvedNFTContracts[nftContract], "Already approved");
        
        approvedNFTContracts[nftContract] = true;
        emit NFTContractApproved(nftContract);
    }
    
    /**
     * @dev Revoke approval for an NFT contract
     * @param nftContract Address of the NFT contract
     */
    function revokeNFTContract(address nftContract) external onlyOwner {
        require(approvedNFTContracts[nftContract], "Not approved");
        
        approvedNFTContracts[nftContract] = false;
        emit NFTContractRevoked(nftContract);
    }
}