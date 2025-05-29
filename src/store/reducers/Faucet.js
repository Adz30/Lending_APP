import { createSlice } from '@reduxjs/toolkit';

const faucetSlice = createSlice({
  name: "faucet",
  initialState: {
    loading: false,
    error: null,
    contract: null,
    tokenAmountA: "0",
    tokenAmountB: "0",
    cooldown: 0,
    lastRequestTimes: {},
  },
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    setContract(state, action) {
      state.contract = action.payload;
    },
    setTokenAmountA(state, action) {
      state.tokenAmountA = action.payload;
    },
    setTokenAmountB(state, action) {
      state.tokenAmountB = action.payload;
    },
    setCooldown(state, action) {
      state.cooldown = action.payload;
    },
    setLastRequestTimes(state, action) {
      state.lastRequestTimes = { ...state.lastRequestTimes, ...action.payload };
    },
  },
});

export const {
  setLoading,
  setError,
  setContract,
  setTokenAmountA,
  setTokenAmountB,
  setCooldown,
  setLastRequestTimes,
} = faucetSlice.actions;

export default faucetSlice.reducer;
