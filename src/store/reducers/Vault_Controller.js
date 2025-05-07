// vaultControllerSlice.js
import { createSlice } from "@reduxjs/toolkit";

const VaultController = createSlice({
  name: "VaultController",
  initialState: {
    contract: null,
    locked: null, // 🔐 add this
  },
  reducers: {
    setVaultControllerContract(state, action) {
      state.contract = action.payload;
    },
    setLockedStatus(state, action) {
      state.locked = action.payload;
    },
  },
});

export const {
  setVaultControllerContract,
  setLockedStatus,
} = VaultController.actions;

export default VaultController.reducer;
