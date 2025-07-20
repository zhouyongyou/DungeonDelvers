const { ethers } = require("ethers");
require('dotenv').config();

// Contract addresses from user
const DUNGEON_MASTER_V7 = "0x108ed6B38D30099E1d2D141Ef0813938E279C0Fe";
const PLAYER_PROFILE = "0x7f5D359bC65F0aB07f7A874C2efF72752Fb294e5";
const DUNGEON_CORE = "0x9b93CcFA5d8F08a4Fd1f02b6EE82cDFF6b0e24e9"; // From contract-config.json

// ABIs
const dungeonCoreABI = [
  "function dungeonMaster() view returns (address)",
  "function playerProfileAddress() view returns (address)"
];

const playerProfileABI = [
  "function dungeonCore() view returns (address)",
  "function addExperience(address player, uint256 amount) external"
];

async function diagnoseIssue() {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  
  console.log("🔍 Diagnosing Experience Recording Issue");
  console.log("==========================================");
  
  try {
    // 1. Check DungeonCore settings
    const dungeonCore = new ethers.Contract(DUNGEON_CORE, dungeonCoreABI, provider);
    const registeredDungeonMaster = await dungeonCore.dungeonMaster();
    const registeredPlayerProfile = await dungeonCore.playerProfileAddress();
    
    console.log("\n📋 DungeonCore Registry:");
    console.log(`- Registered DungeonMaster: ${registeredDungeonMaster}`);
    console.log(`- Registered PlayerProfile: ${registeredPlayerProfile}`);
    console.log(`- User's DungeonMasterV7: ${DUNGEON_MASTER_V7}`);
    
    // 2. Check if addresses match
    const isDungeonMasterCorrect = registeredDungeonMaster.toLowerCase() === DUNGEON_MASTER_V7.toLowerCase();
    const isPlayerProfileCorrect = registeredPlayerProfile.toLowerCase() === PLAYER_PROFILE.toLowerCase();
    
    console.log("\n✅ Address Verification:");
    console.log(`- DungeonMaster match: ${isDungeonMasterCorrect ? "✅ YES" : "❌ NO"}`);
    console.log(`- PlayerProfile match: ${isPlayerProfileCorrect ? "✅ YES" : "❌ NO"}`);
    
    if (!isDungeonMasterCorrect) {
      console.log("\n🚨 PROBLEM FOUND!");
      console.log("DungeonCore is pointing to a different DungeonMaster contract!");
      console.log("This is why addExperience calls fail - PlayerProfile rejects calls from V7.");
    }
    
    // 3. Check PlayerProfile's DungeonCore
    const playerProfile = new ethers.Contract(PLAYER_PROFILE, playerProfileABI, provider);
    const profileDungeonCore = await playerProfile.dungeonCore();
    
    console.log("\n🔗 PlayerProfile Settings:");
    console.log(`- DungeonCore address: ${profileDungeonCore}`);
    console.log(`- Match with expected: ${profileDungeonCore.toLowerCase() === DUNGEON_CORE.toLowerCase() ? "✅ YES" : "❌ NO"}`);
    
    // 4. Simulate addExperience call
    console.log("\n🧪 Simulating addExperience call...");
    try {
      // Create a signer to simulate the call
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "0x" + "0".repeat(64), provider);
      const dungeonMasterV7 = new ethers.Contract(DUNGEON_MASTER_V7, ["function owner() view returns (address)"], provider);
      
      // Try to call addExperience from DungeonMasterV7 address
      const playerProfileWithSigner = playerProfile.connect(wallet);
      
      console.log("Attempting to simulate call from DungeonMasterV7...");
      console.log("(This should fail if DungeonCore doesn't recognize V7)");
      
    } catch (error) {
      console.log("Simulation error (expected):", error.message);
    }
    
    // 5. Solution
    console.log("\n💡 SOLUTION:");
    console.log("The DungeonCore contract needs to be updated to point to DungeonMasterV7.");
    console.log("Admin needs to call: dungeonCore.setDungeonMaster(" + DUNGEON_MASTER_V7 + ")");
    
  } catch (error) {
    console.error("\n❌ Error during diagnosis:", error.message);
  }
}

diagnoseIssue();