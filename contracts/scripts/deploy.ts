import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy FermahProofLog to Base Sepolia and save deployment info.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network baseSepolia
 *
 * After deployment, verify with:
 *   npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <OWNER_ADDRESS>
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying FermahProofLog with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const FermahProofLog = await ethers.getContractFactory("FermahProofLog");

  // Deploy with deployer as initial owner
  const contract = await FermahProofLog.deploy(deployer.address);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("\n✅ FermahProofLog deployed!");
  console.log("   Contract address:", contractAddress);
  console.log("   Deploy tx hash:  ", deployTx?.hash);
  console.log(
    "   Basescan URL:    ",
    `https://sepolia.basescan.org/address/${contractAddress}`
  );

  // Save deployment info for reference
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    contractName: "FermahProofLog",
    address: contractAddress,
    deployer: deployer.address,
    txHash: deployTx?.hash,
    blockNumber: deployTx?.blockNumber,
    basescanUrl: `https://sepolia.basescan.org/address/${contractAddress}`,
    deployedAt: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, "../deployments/baseSepolia.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📄 Deployment info saved to deployments/baseSepolia.json");
  console.log("\n🔍 To verify on Basescan, run:");
  console.log(
    `   npx hardhat verify --network baseSepolia ${contractAddress} ${deployer.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
