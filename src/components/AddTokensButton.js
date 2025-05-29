import React from "react";
import { useSelector } from "react-redux";

const TOKEN_DECIMALS_DEFAULT = 18;

export default function AddTokensButton() {
  const tokens = useSelector((state) => state.tokens.contracts);

  const addTokenToWallet = async (token) => {
    if (!window.ethereum) {
      alert("MetaMask is required to add tokens.");
      return false;
    }

    try {
      const symbol = await token.symbol();

      let decimals;
      try {
        const decimalsRaw = await token.decimals();
        decimals = decimalsRaw.toNumber
          ? decimalsRaw.toNumber()
          : Number(decimalsRaw);
      } catch {
        decimals = TOKEN_DECIMALS_DEFAULT;
      }

      const wasAdded = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: token.address,
            symbol,
            decimals,
            // image: optional token image URL here
          },
        },
      });

      return wasAdded;
    } catch (error) {
      console.error("Error adding token:", error);
      return false;
    }
  };

  const handleAddTokens = async () => {
    if (!tokens || tokens.length === 0) {
      alert("No tokens available to add.");
      return;
    }

    for (const token of tokens) {
      const added = await addTokenToWallet(token);
      if (added) {
        const symbol = await token.symbol(); // log after add
        console.log(`Added ${symbol} to wallet!`);
      } else {
        const symbol = await token.symbol();
        console.log(`Failed to add ${symbol}`);
      }
    }
  };

  return (
    <button
    onClick={handleAddTokens}
    className="px-4 py-2 rounded transition"
    style={{ backgroundColor: '#2563EB', color: '#fff', cursor: 'pointer' }} // blue-600 hex + white text
  >
    Add Tokens to Wallet
  </button>
  
  );
}
