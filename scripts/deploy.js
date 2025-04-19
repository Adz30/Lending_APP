const { ethers } = require("hardhat");

const tokens = (n) => ethers.utils.parseUnits(n.toString(), "ether");

async function main() {
  // Get the deployer's account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Token A
  const TokenA = await ethers.getContractFactory("TOKEN_A");
  const tokenA = await TokenA.deploy("TOKEN_A", "TKNA", tokens(1000000));
  console.log("Token A deployed to:", tokenA.address);

  // Deploy Token B
  const TokenB = await ethers.getContractFactory("TOKEN_B");
  const tokenB = await TokenB.deploy("TOKEN_B", "TKNB", tokens(1000000));
  console.log("Token B deployed to:", tokenB.address);

  // Deploy VaultController
  const VaultController = await ethers.getContractFactory("VAULT_CONTROLLER");
  const vaultController = await VaultController.deploy(deployer.address);
  console.log("VaultController deployed to:", vaultController.address);

  // Deploy Vault A
  const VaultA = await ethers.getContractFactory("VAULT_A");
  const vaultA = await VaultA.deploy(
    "Vault A", 
    "VA", 
    tokenA.address, 
    vaultController.address
  );
  console.log("Vault A deployed to:", vaultA.address);

  // Deploy Vault B
  const VaultB = await ethers.getContractFactory("VAULT_B");
  const vaultB = await VaultB.deploy(
    "Vault B", 
    "VB", 
    tokenB.address, 
    vaultController.address
  );
  console.log("Vault B deployed to:", vaultB.address);

  // Set Vault A and Vault B in VaultController
  await vaultController.setVaultA(vaultA.address);
  await vaultController.setVaultB(vaultB.address);
  console.log("VaultController linked with VaultA and VaultB");

  // Transfer 2000 tokens to VaultA
  const transferAmount = tokens(2000); // 2000 tokens
  await tokenA.transfer(vaultA.address, transferAmount);
  console.log(`Transferred ${ethers.utils.formatUnits(transferAmount, "ether")} tokens to Vault A`);

  // Optional: Transfer tokens to users
  const [user1, user2] = await ethers.getSigners();
  await tokenA.transfer(user1.address, tokens(1000));
  await tokenB.transfer(user2.address, tokens(1000));
  console.log("Transferred tokens to users");
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });