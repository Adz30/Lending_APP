const { ethers } = require("ethers");
require("dotenv").config();
const loadABI = require("./utils/loadABI");

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 🧩 Replace with your actual contract name and address
const contractName = "MyContract"; // without `.json`
const contractAddress = "0xYourContractAddress";

const abi = loadABI(contractName);
const contract = new ethers.Contract(contractAddress, abi, signer);

// 🔊 Listen to events
contract.on("TokenDeposited", async (user, amount) => {
  console.log(
    `📥 Detected deposit from ${user} of ${ethers.utils.formatEther(
      amount
    )} ETH`
  );

  try {
    const tx = await contract.respondToDeposit(user);
    console.log(`🔁 Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Confirmed");
  } catch (e) {
    console.error("❌ Error:", e);
  }
});
