import { ethers } from "ethers";
import { setAccount, setNetwork, setProvider } from "./reducers/provider";
import { setContracts, setSymbols, balancesLoaded } from "./reducers/tokens";
import {
  setVaultAContract,
  setVaultASymbol,
  setVaultAShare,
  setRepaymentAmount,
  vaultABalanceLoaded,
  depositRequest as vaultADepositRequest,
  depositSuccess as vaultADepositSuccess,
  depositFail as vaultADepositFail,
  withdrawRequest as vaultAWithdrawRequest,
  withdrawSuccess as vaultAWithdrawSuccess,
  withdrawFail as vaultAWithdrawFail,
  repaymentRequest,
  repaymentSuccess,
  repaymentFail,
} from "./reducers/VaultA";
import {
  setVaultBContract,
  setVaultBSymbol,
  setVaultBShare,
  vaultBBalanceLoaded,
  depositRequest as vaultBDepositRequest,
  depositSuccess as vaultBDepositSuccess,
  depositFail as vaultBDepositFail,
  WithdrawRequest as vaultBWithdrawRequest,
  WithdrawSuccess as vaultBWithdrawSuccess,
  WithdrawFail as vaultBWithdrawFail,
} from "./reducers/VaultB";
import {
  setVaultControllerContract,
  setLockedStatus,
} from "./reducers/Vault_Controller";
import TOKEN_ABI from "../abis/Token.json";
import VAULT_A_ABI from "../abis/VAULT_A.json";
import VAULT_B_ABI from "../abis/VAULT_B.json";
import VAULT_CONTROLLER_ABI from "../abis/VAULT_CONTROLLER.json";
import config from "../config.json";

// --- Load provider ---
export const loadProvider = (dispatch) => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  dispatch(setProvider(provider));
  return provider;
};

// --- Load network ---
export const loadNetwork = async (provider, dispatch) => {
  const { chainId } = await provider.getNetwork();
  dispatch(setNetwork(chainId));
  return chainId;
};

// --- Load account ---
export const loadAccount = async (dispatch) => {
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  const account = ethers.utils.getAddress(accounts[0]);
  dispatch(setAccount(account));
  return account;
};

// --- Load token contracts ---
export const loadTokens = async (provider, chainId, dispatch) => {
  try {
    // Create token contract instances
    const TOKEN_A = new ethers.Contract(
      config[chainId].TOKEN_A.address,
      TOKEN_ABI,
      provider
    );
    const TOKEN_B = new ethers.Contract(
      config[chainId].TOKEN_B.address,
      TOKEN_ABI,
      provider
    );

    // Fetch symbols for the tokens
    const symbolA = await TOKEN_A.symbol();
    const symbolB = await TOKEN_B.symbol();

    // Log token contract details (not the tokens array)
    console.log("Token A Contract:", TOKEN_A);
    console.log("Token B Contract:", TOKEN_B);

    // Dispatch contracts and symbols to Redux
    dispatch(setContracts([TOKEN_A, TOKEN_B]));
    dispatch(setSymbols([symbolA, symbolB]));
    return { TOKEN_A, TOKEN_B };
  } catch (error) {
    console.error("Failed to load token contracts:", error);
  }
};

export const loadVaultController = async (provider, chainId, dispatch) => {
  try {
   
    const VaultController = new ethers.Contract(
      config[chainId].VAULT_CONTROLLER.address,
      VAULT_CONTROLLER_ABI,
      provider
    );

    // Dispatch the contracts to your state
    dispatch(setVaultControllerContract(VaultController));

    // Return the vault contracts
    return {VaultController};
  } catch (error) {
    console.error("Failed to load vault contracts:", error);
  }
};

// --- Load vault contracts ---
export const loadVaults = async (provider, chainId, dispatch) => {
  try {
    // Create contract instances for VAULT_A and VAULT_B
    const VAULT_A = new ethers.Contract(
      config[chainId].VAULT_A.address,
      VAULT_A_ABI,
      provider
    );
    const VAULT_B = new ethers.Contract(
      config[chainId].VAULT_B.address,
      VAULT_B_ABI,
      provider
    );

    // Dispatch the contracts to your state
    dispatch(setVaultAContract(VAULT_A));
    dispatch(setVaultBContract(VAULT_B));

    // Return the vault contracts
    return { VAULT_A, VAULT_B };
  } catch (error) {
    console.error("Failed to load vault contracts:", error);
  }
};

// --- Load balances and shares ---
export const loadBalances = async (tokens, account, dispatch) => {
  try {
    // Ensure tokens are loaded
    if (!tokens || tokens.length < 2) {
      console.error("Tokens not loaded:", tokens);
      throw new Error("Token contracts not loaded");
    }

    // Load token balances
    const balance1 = await tokens[0].balanceOf(account);
    const balance2 = await tokens[1].balanceOf(account);

    const formattedBalance1 = ethers.utils.formatUnits(balance1, "ether");
    const formattedBalance2 = ethers.utils.formatUnits(balance2, "ether");

    dispatch(balancesLoaded([formattedBalance1, formattedBalance2]));

    return {
      balance1: formattedBalance1,
      balance2: formattedBalance2,
    };
  } catch (error) {
    console.error("Failed to load token balances:", error);
    return null;
  }
};

export const loadVaultShares = async (VAULT_A, VAULT_B, account, dispatch) => {
  try {
    if (!VAULT_A || !VAULT_B || !account) {
      throw new Error("Missing required parameters");
    }
    console.log("Loading vault shares for account:", account);

    // Load share balances
    const sharesA = await VAULT_A.balanceOf(account);
    const sharesB = await VAULT_B.balanceOf(account);

    // Format the values (adjust decimals if needed)
    const formattedSharesA = ethers.utils.formatUnits(sharesA, 18);
    const formattedSharesB = ethers.utils.formatUnits(sharesB, 18);

    // Dispatch to Redux
    dispatch(setVaultAShare(formattedSharesA));
    dispatch(setVaultBShare(formattedSharesB));

    return {
      vaultAShares: formattedSharesA,
      vaultBShares: formattedSharesB
    };
  } catch (error) {
    console.error("Failed to load vault shares:", error);
    throw error;
  }
};

export const loadVaultBalances = async (
  VAULT_A,
  VAULT_B,
  provider,
  account,
  dispatch
) => {
  try {
    if (!VAULT_A || !VAULT_B) {
      console.error("Vault contracts are undefined:", { VAULT_A, VAULT_B });
      throw new Error("Vault contracts are not loaded properly");
    }

    if (
      typeof VAULT_A.asset !== "function" ||
      typeof VAULT_B.asset !== "function"
    ) {
      console.error("asset() method not found in VAULT_A or VAULT_B contract");
      throw new Error("asset() method missing in vault contract");
    }

    const assetAAddress = await VAULT_A.asset();
    const assetBAddress = await VAULT_B.asset();

    console.log("Asset A Address:", assetAAddress);
    console.log("Asset B Address:", assetBAddress);

    if (
      !ethers.utils.isAddress(assetAAddress) ||
      !ethers.utils.isAddress(assetBAddress)
    ) {
      throw new Error("Invalid asset addresses");
    }

    const tokenA = new ethers.Contract(assetAAddress, TOKEN_ABI, provider);
    const tokenB = new ethers.Contract(assetBAddress, TOKEN_ABI, provider);

    console.log("Token A Contract:", tokenA);
    console.log("Token B Contract:", tokenB);

    const vaultABalance = await tokenA.balanceOf(VAULT_A.address);
    const vaultBBalance = await tokenB.balanceOf(VAULT_B.address);
    
    console.log("Vault A Balance (Token A in Vault):", vaultABalance.toString());
    console.log("Vault B Balance (Token B in Vault):", vaultBBalance.toString());


    const formattedA = ethers.utils.formatUnits(vaultABalance, "ether");
    const formattedB = ethers.utils.formatUnits(vaultBBalance, "ether");


    const symbolA = await VAULT_A.symbol();
    const symbolB = await VAULT_B.symbol();

    // Updated dispatches
    dispatch(vaultABalanceLoaded(formattedA));
    dispatch(vaultBBalanceLoaded(formattedB));
    dispatch(setVaultASymbol(symbolA));
    dispatch(setVaultBSymbol(symbolB));
 

    return {
      vaultABalance: formattedA,
      vaultBBalance: formattedB,
    
      symbolA,
      symbolB
    };

  } catch (err) {
    console.error("Failed to load vault asset balances:", err);
  }
};


export const checkLockedStatus = async (VaultController, account, dispatch) => {
  if (!VaultController || !VaultController.contract) {
    console.error("VaultController is not properly initialized.");
    dispatch(setLockedStatus(false)); // Dispatch false in case of error
    return false;
  }

  try {
    const locked = await VaultController.contract.locked(account);
    console.log("Locked status:", locked);
    dispatch(setLockedStatus(locked));
    return locked;
  } catch (error) {
    console.error("Error checking locked status:", error);
    dispatch(setLockedStatus(false));
    return false;
  }
};


export const depositIntoVaultA = async (
  provider,
  VAULT_A,
  tokenA,
  amount,
  dispatch
) => {
  try {
    dispatch(vaultADepositRequest());

    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Step 1: Approve Vault A to spend Token A
    let transaction = await tokenA
      .connect(signer)
      .approve(VAULT_A.address, amount);
    await transaction.wait();

    // Step 2: Deposit into Vault A
    transaction = await VAULT_A.connect(signer).deposit(amount, userAddress);
    await transaction.wait();

    dispatch(vaultADepositSuccess(transaction.hash));
  } catch (error) {
    console.error("Deposit failed:", error);
    dispatch(vaultADepositFail());
  }
};

export const depositIntoVaultB = async (
  provider,
  VAULT_B,
  tokenB,
  amount,
  dispatch
) => {
  try {
    dispatch(vaultBDepositRequest());

    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Step 1: Approve Vault B to spend Token B
    let transaction = await tokenB
      .connect(signer)
      .approve(VAULT_B.address, amount);
    await transaction.wait();

    // Step 2: Deposit into Vault B
    transaction = await VAULT_B.connect(signer).deposit(amount, userAddress);
    await transaction.wait();

    dispatch(vaultBDepositSuccess(transaction.hash));
  } catch (error) {
    console.error("Deposit failed:", error);
    dispatch(vaultBDepositFail());
  }
};
export const repayIntoVaultA = async (
  provider,
  VAULT_A,
  tokenA,
  amount,
  dispatch
) => {
  try {
    dispatch(repaymentRequest());

    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Step 1: Approve Vault A to spend Token A
    let transaction = await tokenA
      .connect(signer)
      .approve(VAULT_A.address, amount);
    await transaction.wait();

    // Step 2: Deposit into Vault A
    transaction = await VAULT_A.connect(signer).repayLoan(amount, userAddress);
    await transaction.wait();

    dispatch(repaymentSuccess(transaction.hash));
  } catch (error) {
    console.error("Repayment failed:", error);
    dispatch(repaymentFail());
  }
};
export const WithdrawFromVaultB = async (
  provider,
  VAULT_B,
  tokenB,
  amount,
  dispatch
) => {
  try {
    dispatch(vaultBWithdrawRequest());

    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    //  Withdraw Vault B
    transaction = await VAULT_B.connect(signer).withdraw(
      amount,
      userAddress,
      userAddress
    );
    await transaction.wait();

    dispatch(vaultBWithdrawSuccess(transaction.hash));
  } catch (error) {
    console.error("Withdraw failed:", error);
    dispatch(vaultBWithdrawFail());
  }
};
export const WithdrawFromVaultA = async (
  provider,
  VAULT_A,
  tokenA,
  amount,
  dispatch
) => {
  try {
    // Dispatch withdraw request action
    dispatch(vaultAWithdrawRequest());

    // Get signer and address
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Withdraw from Vault A
    const transaction = await VAULT_A.connect(signer).withdraw(
      amount,
      userAddress,
      userAddress
    );

    // Wait for the transaction to be mined and get the receipt
    const receipt = await transaction.wait();

    // Dispatch success action with transaction hash
    dispatch(vaultAWithdrawSuccess(receipt.transactionHash));
  } catch (error) {
    console.error("Withdraw failed:", error);

    // Dispatch fail action
    dispatch(vaultAWithdrawFail());
  }
}
export const loadRepaymentAmount = async (VAULT_A, account, dispatch) => {
  try {
    const rawAmount = await VAULT_A.repaymentAmounts(account);
    const formatted = ethers.utils.formatUnits(rawAmount, 18);
    dispatch(setRepaymentAmount(formatted));
  } catch (error) {
    console.error("Error loading repayment amount:", error);
    dispatch(setRepaymentAmount(null));
  }
};