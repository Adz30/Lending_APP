const { ethers } = require("hardhat");

const tokens = (n) => ethers.utils.parseUnits(n.toString(), "ether");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const TokenA = await ethers.getContractFactory("TOKEN_A");
  const tokenA = await TokenA.deploy("TOKEN_A", "TKNA", tokens(1000000));
  console.log("Token A deployed to:", tokenA.address);

  const TokenB = await ethers.getContractFactory("TOKEN_B");
  const tokenB = await TokenB.deploy("TOKEN_B", "TKNB", tokens(1000000));
  console.log("Token B deployed to:", tokenB.address);

  const VaultController = await ethers.getContractFactory("VAULT_CONTROLLER");
  const vaultController = await VaultController.deploy(deployer.address);
  console.log("VaultController deployed to:", vaultController.address);

  const VaultA = await ethers.getContractFactory("VAULT_A");
  const vaultA = await VaultA.deploy(
    "Vault A",
    "VA",
    tokenA.address,
    vaultController.address,
  );
  console.log("Vault A deployed to:", vaultA.address);

  const VaultB = await ethers.getContractFactory("VAULT_B");
  const vaultB = await VaultB.deploy(
    "Vault B",
    "VB",
    tokenB.address,
    vaultController.address,
  );
  console.log("Vault B deployed to:", vaultB.address);

  await vaultController.setVaultA(vaultA.address);
  await vaultController.setVaultB(vaultB.address);
  console.log("VaultController linked with VaultA and VaultB");

  const gasLimit = 600_000;
  const transferAmount = tokens(1000);

  console.log("Deployer Address:", deployer.address);
  await tokenA.connect(deployer).approve(vaultA.address, transferAmount, { gasLimit });
  await vaultA.connect(deployer).setFunds(transferAmount, { gasLimit });
  console.log(`Set ${ethers.utils.formatUnits(transferAmount, "ether")} tokens in Vault A using setFunds`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
