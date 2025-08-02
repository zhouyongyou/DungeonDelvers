// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title OfferSystemV2
 * @dev Multi-currency offer system for DungeonDelvers marketplace
 * @notice Allows users to make offers on NFTs with multiple stablecoin options
 */
contract OfferSystemV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =================================================================
    // State Variables
    // =================================================================
    
    uint256 private _offerIds;
    
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
    
    enum OfferStatus {
        ACTIVE,
        ACCEPTED,
        DECLINED,
        EXPIRED,
        CANCELLED
    }
    
    struct Offer {
        uint256 id;
        address buyer;
        address seller;
        NFTType nftType;
        address nftContract;
        uint256 tokenId;
        uint256 amount;        // Offer amount in USD (18 decimals)
        address paymentToken;  // Token buyer will use for payment
        uint256 expiresAt;
        OfferStatus status;
        string message;
        uint256 createdAt;
    }
    
    // Mappings
    mapping(uint256 => Offer) public offers;
    mapping(address => uint256[]) public userOffersMade;
    mapping(address => uint256[]) public userOffersReceived;
    mapping(address => mapping(uint256 => uint256[])) public nftOffers; // nftContract => tokenId => offerIds
    
    // =================================================================
    // Events
    // =================================================================
    
    event OfferMade(
        uint256 indexed offerId,
        address indexed buyer,
        address indexed seller,
        NFTType nftType,
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        address paymentToken,
        uint256 expiresAt
    );
    
    event OfferAccepted(
        uint256 indexed offerId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        address paymentToken,
        uint256 platformFeeAmount
    );
    
    event OfferDeclined(
        uint256 indexed offerId,
        address indexed seller
    );
    
    event OfferCancelled(
        uint256 indexed offerId,
        address indexed buyer
    );
    
    event OfferExpired(
        uint256 indexed offerId
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
     * @dev Make an offer on an NFT
     * @param seller Current owner of the NFT
     * @param nftType Type of NFT
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID of the NFT
     * @param amount Offer amount in USD (18 decimals)
     * @param paymentToken Token to use for payment
     * @param duration Duration in seconds until offer expires
     * @param message Optional message to seller
     */
    function makeOffer(
        address seller,
        NFTType nftType,
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        address paymentToken,
        uint256 duration,
        string calldata message
    ) external nonReentrant {
        require(approvedNFTContracts[nftContract], "NFT contract not approved");
        require(supportedTokens[paymentToken], "Payment token not supported");
        require(seller != address(0) && seller != msg.sender, "Invalid seller");
        require(amount > 0, "Amount must be greater than 0");
        require(duration >= 3600 && duration <= 30 days, "Invalid duration");
        
        // Verify NFT ownership
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == seller, "Seller not owner");
        
        // Transfer offer amount to escrow
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        
        _offerIds++;
        uint256 offerId = _offerIds;
        
        uint256 expiresAt = block.timestamp + duration;
        
        offers[offerId] = Offer({
            id: offerId,
            buyer: msg.sender,
            seller: seller,
            nftType: nftType,
            nftContract: nftContract,
            tokenId: tokenId,
            amount: amount,
            paymentToken: paymentToken,
            expiresAt: expiresAt,
            status: OfferStatus.ACTIVE,
            message: message,
            createdAt: block.timestamp
        });
        
        userOffersMade[msg.sender].push(offerId);
        userOffersReceived[seller].push(offerId);
        nftOffers[nftContract][tokenId].push(offerId);
        
        emit OfferMade(
            offerId,
            msg.sender,
            seller,
            nftType,
            nftContract,
            tokenId,
            amount,
            paymentToken,
            expiresAt
        );
    }
    
    /**
     * @dev Accept an offer
     * @param offerId ID of the offer to accept
     */
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.seller == msg.sender, "Not the seller");
        require(offer.status == OfferStatus.ACTIVE, "Offer not active");
        require(block.timestamp < offer.expiresAt, "Offer expired");
        
        // Verify NFT ownership and approval
        IERC721 nft = IERC721(offer.nftContract);
        require(nft.ownerOf(offer.tokenId) == msg.sender, "Not owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(offer.tokenId) == address(this),
            "Contract not approved"
        );
        
        offer.status = OfferStatus.ACCEPTED;
        
        uint256 feeAmount = (offer.amount * platformFee) / 10000;
        uint256 sellerAmount = offer.amount - feeAmount;
        
        // Transfer payment from escrow
        IERC20 token = IERC20(offer.paymentToken);
        token.safeTransfer(msg.sender, sellerAmount);
        if (feeAmount > 0) {
            token.safeTransfer(feeRecipient, feeAmount);
        }
        
        // Transfer NFT
        nft.safeTransferFrom(msg.sender, offer.buyer, offer.tokenId);
        
        emit OfferAccepted(
            offerId,
            offer.buyer,
            msg.sender,
            offer.amount,
            offer.paymentToken,
            feeAmount
        );
    }
    
    /**
     * @dev Decline an offer
     * @param offerId ID of the offer to decline
     */
    function declineOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        require(offer.seller == msg.sender, "Not the seller");
        require(offer.status == OfferStatus.ACTIVE, "Offer not active");
        
        offer.status = OfferStatus.DECLINED;
        
        // Refund to buyer
        IERC20(offer.paymentToken).safeTransfer(offer.buyer, offer.amount);
        
        emit OfferDeclined(offerId, msg.sender);
    }
    
    /**
     * @dev Cancel an offer (by buyer)
     * @param offerId ID of the offer to cancel
     */
    function cancelOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        require(offer.buyer == msg.sender, "Not the buyer");
        require(offer.status == OfferStatus.ACTIVE, "Offer not active");
        
        offer.status = OfferStatus.CANCELLED;
        
        // Refund to buyer
        IERC20(offer.paymentToken).safeTransfer(msg.sender, offer.amount);
        
        emit OfferCancelled(offerId, msg.sender);
    }
    
    /**
     * @dev Process expired offers (can be called by anyone)
     * @param offerIds Array of offer IDs to check and process
     */
    function processExpiredOffers(uint256[] calldata offerIds) external {
        for (uint i = 0; i < offerIds.length; i++) {
            Offer storage offer = offers[offerIds[i]];
            
            if (offer.status == OfferStatus.ACTIVE && block.timestamp >= offer.expiresAt) {
                offer.status = OfferStatus.EXPIRED;
                
                // Refund to buyer
                IERC20(offer.paymentToken).safeTransfer(offer.buyer, offer.amount);
                
                emit OfferExpired(offerIds[i]);
            }
        }
    }
    
    // =================================================================
    // View Functions
    // =================================================================
    
    /**
     * @dev Get current offer ID counter
     * @return Current offer ID
     */
    function getCurrentOfferId() external view returns (uint256) {
        return _offerIds;
    }
    
    /**
     * @dev Check if an offer is still valid
     * @param offerId ID of the offer
     * @return isValid Whether the offer is valid
     */
    function isOfferValid(uint256 offerId) external view returns (bool) {
        Offer memory offer = offers[offerId];
        
        if (offer.status != OfferStatus.ACTIVE) return false;
        if (block.timestamp >= offer.expiresAt) return false;
        
        // Check NFT ownership
        try IERC721(offer.nftContract).ownerOf(offer.tokenId) returns (address owner) {
            return owner == offer.seller;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Get offers made by a user
     * @param user Address of the user
     * @return Array of offer IDs
     */
    function getUserOffersMade(address user) external view returns (uint256[] memory) {
        return userOffersMade[user];
    }
    
    /**
     * @dev Get offers received by a user
     * @param user Address of the user
     * @return Array of offer IDs
     */
    function getUserOffersReceived(address user) external view returns (uint256[] memory) {
        return userOffersReceived[user];
    }
    
    /**
     * @dev Get offers for a specific NFT
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID
     * @return Array of offer IDs
     */
    function getNFTOffers(address nftContract, uint256 tokenId) external view returns (uint256[] memory) {
        return nftOffers[nftContract][tokenId];
    }
    
    /**
     * @dev Get all supported payment tokens
     * @return Array of token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
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
    
    /**
     * @dev Emergency withdraw tokens (only for stuck tokens)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token");
        IERC20(token).safeTransfer(owner(), amount);
    }
}