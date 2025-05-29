import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Container } from "react-bootstrap";

// Components
import Navigation from "./Navigation";
import Tabs from "./Tabs";
import Earn from "./Earn";
import LendTokens from "./LendTokens";
import RepayLoan from "./RepayLoan";
import VaultStatus from "./VaultStatus";
import Faucet from "./Faucet";

// Interactions
import {
  loadProvider,
  loadNetwork,
  loadAccount,
  loadTokens,
  loadVaults,
  loadBalances,
  loadVaultBalances,
  checkLockedStatus,
  loadVaultController,
  loadVaultShares,
  loadFaucet,
  loadUserLastRequestTime,
} from "../store/interactions";

function App() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  // Using Redux state
  const provider = useSelector((state) => state.provider.connection);
  const account = useSelector((state) => state.provider.account);
  const tokens = useSelector((state) => state.tokens.contracts);
  const chainId = useSelector((state) => state.provider.chainId);

  const loadBlockchainData = async () => {
    setLoading(true);
    try {
      console.log("Loading provider...");
      const provider = await loadProvider(dispatch);
      if (!provider) throw new Error("Failed to load provider");
      console.log("Provider loaded:", provider);

      console.log("Loading network...");
      const chainId = await loadNetwork(provider, dispatch);
      console.log("Network loaded:", chainId);

      // Setup event listeners
      const handleChainChanged = () => {
        console.log("Chain changed - reloading");
        window.location.reload();
      };
      const handleAccountsChanged = async () => {
        console.log("Accounts changed - reloading account");
        await loadAccount(dispatch);
      };

      if (window.ethereum) {
        window.ethereum.on("chainChanged", handleChainChanged);
        window.ethereum.on("accountsChanged", handleAccountsChanged);
      }

      console.log("Loading account...");
      const currentAccount = await loadAccount(dispatch);
      if (!currentAccount) throw new Error("Failed to load account");
      console.log("Account loaded:", currentAccount);

      console.log("Loading faucet...");
      const faucet = await loadFaucet(provider, chainId, dispatch);
      if (!faucet) throw new Error("Failed to load faucet");
      console.log("Faucet loaded:", faucet);

      await loadUserLastRequestTime(faucet, currentAccount, dispatch);

      console.log("Loading tokens...");
      const { TOKEN_A, TOKEN_B } = await loadTokens(provider, chainId, dispatch);
      if (!TOKEN_A || !TOKEN_B) throw new Error("Failed to load tokens");
      console.log("Tokens loaded:", TOKEN_A.address, TOKEN_B.address);

      await loadBalances([TOKEN_A, TOKEN_B], currentAccount, dispatch);
      console.log("Token balances loaded");

      console.log("Loading vaults...");
      const { VAULT_A, VAULT_B } = await loadVaults(provider, chainId, dispatch);
      if (!VAULT_A || !VAULT_B) throw new Error("Failed to load vaults");
      console.log("Vaults loaded:", VAULT_A.address, VAULT_B.address);

      await loadVaultBalances(VAULT_A, VAULT_B, provider, currentAccount, dispatch);
      console.log("Vault balances loaded");

      console.log("Loading vault controller...");
      const vaultController = await loadVaultController(provider, chainId, dispatch);
      if (!vaultController) throw new Error("Failed to load vault controller");
      console.log("Vault controller loaded:", vaultController.address);

      await checkLockedStatus(vaultController, currentAccount, dispatch);
      console.log("Locked status checked");

      const shares = await loadVaultShares(VAULT_A, VAULT_B, currentAccount, dispatch);
      console.log("Vault shares loaded:", shares);
    } catch (error) {
      console.error("Error loading blockchain data:", error);
      // You can optionally dispatch an error state here if you want to display an error UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockchainData();

    // Define handlers outside for proper removal
    const handleChainChanged = () => {
      console.log("Chain changed - reloading");
      window.location.reload();
    };
    const handleAccountsChanged = async () => {
      console.log("Accounts changed - reloading account");
      await loadAccount(dispatch);
    };

    // Add listeners
    if (window.ethereum) {
      window.ethereum.on("chainChanged", handleChainChanged);
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, [dispatch]);

  if (loading) {
    return (
      <Container className="py-4">
        <p>Loading blockchain data...</p>
      </Container>
    );
  }

  return (
    <Container>
      <HashRouter>
        <Navigation />
        <hr />
        <Tabs />
        <Routes>
          <Route exact path="/" element={<VaultStatus />} />
          <Route path="/Earn" element={<Earn />} />
          <Route path="/LendTokens" element={<LendTokens />} />
          {/* Add RepayLoan route if you want */}
          {/* <Route path="/RepayLoan" element={<RepayLoan />} /> */}
        </Routes>
      </HashRouter>
    </Container>
  );
}

export default App;