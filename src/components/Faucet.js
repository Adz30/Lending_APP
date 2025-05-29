import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AddTokensButton from "./AddTokensButton";

// Import interaction functions
import {
  loadFaucetConfig,
  loadUserLastRequestTime,
  requestTokens,
} from "../store/interactions";

const Faucet = () => {
  const dispatch = useDispatch();

  // Redux state selectors
  const provider = useSelector((state) => state.provider.connection);
  const tokens = useSelector((state) => state.tokens.contracts); // array of token objects
  const account = useSelector((state) => state.provider.account);
  const faucet = useSelector((state) => state.faucet.contract);
  const cooldown = useSelector((state) => state.faucet.cooldown);
  const lastRequest = useSelector(
    (state) => state.faucet.lastRequestTimes?.[account]
  );

  const [canRequest, setCanRequest] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (faucet && account && typeof dispatch === "function") {
      loadFaucetConfig(faucet, dispatch);
      loadUserLastRequestTime(faucet, account, dispatch);
    }
  }, [faucet, account, dispatch]);

  useEffect(() => {
    if (
      cooldown !== undefined &&
      cooldown !== null &&
      lastRequest !== undefined &&
      lastRequest !== null
    ) {
      const now = Math.floor(Date.now() / 1000);
      const diff = cooldown - (now - lastRequest);
      setTimeLeft(diff > 0 ? diff : 0);
      setCanRequest(diff <= 0);
    } else {
      setTimeLeft(0);
      setCanRequest(true); // Allow requesting if no data
    }
  }, [cooldown, lastRequest]);

  const handleRequest = async () => {
    if (!faucet || !provider || !account) return;
    try {
      await requestTokens(faucet, account, dispatch);
      await loadUserLastRequestTime(faucet, account, dispatch);
    } catch (error) {
      console.error("Error requesting tokens:", error);
    }
  };

  return (
    <div className="p-4 rounded-xl shadow bg-white text-center mt-4">
      <h2 className="text-xl font-semibold mb-2">Faucet</h2>
      <p className="mb-4">Get test tokens for your wallet.</p>

      {/* Render your tokens with unique keys */}
      <AddTokensButton />
 <div className="mb-6">
  <h3 className="text-lg font-semibold mb-3 text-gray-800">Manually add the token addresses to your Metamask or click the button above </h3>
  {tokens && tokens.length > 0 ? (
    <ul className="space-y-2 list-none p-0">
      {tokens.map((token) => (
        <li
          key={token.address}
          className="p-3 bg-gray-100 rounded-lg shadow-sm text-sm text-gray-700"
        >
          <span className="font-medium text-blue-600">{token.symbol}</span>
          <span className="ml-2 text-xs break-all">{token.address}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-gray-500">No tokens available.</p>
  )}
</div>

      <button
        onClick={handleRequest}
        disabled={!canRequest}
        className="px-4 py-2 rounded-lg font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed"
        style={{
          backgroundColor: "#2563eb", // Tailwind's blue-600
          opacity: canRequest ? 1 : 0.5,
          cursor: canRequest ? "pointer" : "not-allowed",
        }}
      >
        Request Tokens
      </button>

      {!canRequest && (
        <p className="text-sm text-red-600 mt-2">
          Please wait {timeLeft} second{timeLeft !== 1 ? "s" : ""} for the
          cooldown period to pass.
        </p>
      )}
    </div>
  );
};

export default Faucet;
