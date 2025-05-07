import provider from "./reducers/provider";
import tokens from "./reducers/tokens";
import VaultA from "./reducers/VaultA";  // Your Vault A reducer
import VaultB from "./reducers/VaultB";  // Your Vault B reducer
import  VaultController  from "./reducers/Vault_Controller";
import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    provider,
    tokens,
    vaultA: VaultA,
    vaultB: VaultB,
    VaultController
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});