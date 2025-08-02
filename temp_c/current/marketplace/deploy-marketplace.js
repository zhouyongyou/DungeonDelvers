// scripts/deploy-marketplace.js
// Deploy script for DungeonMarketplace and OfferSystem contracts

const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying DungeonDelvers Marketplace Contracts...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Contract addresses (BSC Mainnet)
    const SOUL_TOKEN = "0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF"; // SoulShard token
    const HERO_CONTRACT = "0x76C9c7E9a82132739A6E6B04FD87f16801F4EF22";
    const RELIC_CONTRACT = "0xe66036839c7E5F8372ADC36da8f0357429a96A34";
    const PARTY_CONTRACT = "0x22Ac9b248716FA64eD97025c77112c4c3e0169ab";
    
    // Platform fee recipient (can be changed later by owner)
    const FEE_RECIPIENT = "0x10925A7138649C7E1794CE646182eeb5BF8ba647"; // DungeonMaster wallet
    
    // Approved NFT contracts
    const APPROVED_NFTS = [HERO_CONTRACT, RELIC_CONTRACT, PARTY_CONTRACT];

    try {
        // Deploy DungeonMarketplace
        console.log("\n1. Deploying DungeonMarketplace...");
        const DungeonMarketplace = await ethers.getContractFactory("DungeonMarketplace");
        const marketplace = await DungeonMarketplace.deploy(
            SOUL_TOKEN,
            FEE_RECIPIENT,
            APPROVED_NFTS
        );
        
        await marketplace.deployed();
        console.log("✅ DungeonMarketplace deployed to:", marketplace.address);
        
        // Deploy OfferSystem
        console.log("\n2. Deploying OfferSystem...");
        const OfferSystem = await ethers.getContractFactory("OfferSystem");
        const offerSystem = await OfferSystem.deploy(
            SOUL_TOKEN,
            FEE_RECIPIENT,
            APPROVED_NFTS
        );
        
        await offerSystem.deployed();
        console.log("✅ OfferSystem deployed to:", offerSystem.address);
        
        // Wait for a few block confirmations
        console.log("\n3. Waiting for block confirmations...");
        await marketplace.deployTransaction.wait(5);
        await offerSystem.deployTransaction.wait(5);
        
        // Verify deployment
        console.log("\n4. Verifying deployment...");
        
        // Check marketplace configuration
        const marketplaceFee = await marketplace.platformFee();
        const marketplaceFeeRecipient = await marketplace.feeRecipient();
        console.log("Marketplace platform fee:", marketplaceFee.toString(), "basis points");
        console.log("Marketplace fee recipient:", marketplaceFeeRecipient);
        
        // Check offer system configuration
        const offerSystemFee = await offerSystem.platformFee();
        const offerSystemFeeRecipient = await offerSystem.feeRecipient();
        console.log("OfferSystem platform fee:", offerSystemFee.toString(), "basis points");
        console.log("OfferSystem fee recipient:", offerSystemFeeRecipient);
        
        // Generate configuration update
        console.log("\n5. Configuration Update Required:");
        console.log("=====================================");
        console.log("Update the following in your configuration files:");
        console.log("");
        console.log("Frontend (src/config/contracts.ts):");
        console.log(`DUNGEONMARKETPLACE: '${marketplace.address}',`);
        console.log(`OFFERSYSTEM: '${offerSystem.address}',`);
        console.log("");
        console.log("Subgraph (subgraph.yaml):");
        console.log(`DungeonMarketplace address: '${marketplace.address}'`);
        console.log(`OfferSystem address: '${offerSystem.address}'`);
        console.log("");
        console.log("Deployment block:", await ethers.provider.getBlockNumber());
        
        // Generate verification commands
        console.log("\n6. Contract Verification Commands:");
        console.log("===================================");
        console.log("Run these commands to verify contracts on BSCScan:");
        console.log("");
        console.log(`npx hardhat verify --network bsc ${marketplace.address} "${SOUL_TOKEN}" "${FEE_RECIPIENT}" "[${APPROVED_NFTS.map(addr => `"${addr}"`).join(",")}]"`);
        console.log("");
        console.log(`npx hardhat verify --network bsc ${offerSystem.address} "${SOUL_TOKEN}" "${FEE_RECIPIENT}" "[${APPROVED_NFTS.map(addr => `"${addr}"`).join(",")}]"`);
        
        console.log("\n✅ Deployment completed successfully!");
        
        return {
            marketplace: marketplace.address,
            offerSystem: offerSystem.address,
            deploymentBlock: await ethers.provider.getBlockNumber()
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };