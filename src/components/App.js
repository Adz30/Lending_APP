import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Container } from "react-bootstrap";
import { ethers } from "ethers";

// Components
import Navigation from "./Navigation";
import Tabs from "./Tabs";
import Earn from "./Earn";
import LendTokens from "./LendTokens";
import RepayLoan from "./RepayLoan";
import VaultStatus from "./VaultStatus";

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
      // 1. Load provider first
      const provider = await loadProvider(dispatch);
      if (!provider) throw new Error("Failed to load provider");

      // 2. Load network
      const chainId = await loadNetwork(provider, dispatch);

      // 3. Setup event listeners
      const handleChainChanged = () => window.location.reload();
      const handleAccountsChanged = async () => {
        await loadAccount(dispatch);
      };

      window.ethereum.on("chainChanged", handleChainChanged);
      window.ethereum.on("accountsChanged", handleAccountsChanged);

      // 4. Load account - wait for this to complete
      const currentAccount = await loadAccount(dispatch);
      if (!currentAccount) throw new Error("Failed to load account");

      // 5. Load tokens
      const { TOKEN_A, TOKEN_B } = await loadTokens(
        provider,
        chainId,
        dispatch
      );
      if (!TOKEN_A || !TOKEN_B) throw new Error("Failed to load tokens");

      // 6. Load token balances
      await loadBalances([TOKEN_A, TOKEN_B], currentAccount, dispatch);

      // 7. Load vaults
      const { VAULT_A, VAULT_B } = await loadVaults(
        provider,
        chainId,
        dispatch
      );
      if (!VAULT_A || !VAULT_B) throw new Error("Failed to load vaults");

      // 8. Load vault balances
      await loadVaultBalances(
        VAULT_A,
        VAULT_B,
        provider,
        currentAccount,
        dispatch
      );

      // 10. Load vault controller
      const vaultController = await loadVaultController(
        provider,
        chainId,
        dispatch
      );
      if (!vaultController) throw new Error("Failed to load vault controller");

      // 11. Check locked status
      await checkLockedStatus(vaultController, currentAccount, dispatch);
      // 9. Load vault shares
      const shares = await loadVaultShares(VAULT_A, VAULT_B, currentAccount, dispatch);
      console.log("shares", shares)    } catch (error) {
      console.error("Error loading blockchain data:", error);
      // Optionally dispatch an error state here
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockchainData();

    // Cleanup function
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("chainChanged", () =>
          window.location.reload()
        );
        window.ethereum.removeListener("accountsChanged", async () => {
          await loadAccount(dispatch);
        });
      }
    };
  }, [dispatch]); // Added dispatch to dependency array

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
         
        </Routes>
      </HashRouter>
    </Container>
  );
}

export default App;
