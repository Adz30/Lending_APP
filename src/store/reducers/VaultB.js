import { createSlice } from '@reduxjs/toolkit';

export const VaultB = createSlice({
  name: 'VaultB',
  initialState: {
    VAULT_B: null,
    VaultBSymbol: null,
    vaultBBalance: 0,
    locked: null,
    depositing: {
      isDepositing: false,
      isSuccess: false,
      transactionHash: null
    },
    repaying: {
      isRepaying: false,
      isSuccess: false,
      transactionHash: null
    },
    withdrawing: {
      isWithdrawing: false,
      isSuccess: false,
      transactionHash: null
    }
  },
  reducers: {
    setVaultBContract: (state, action) => {
      state.VAULT_B = action.payload;
    },
    setVaultBSymbol: (state, action) => {
      state.VaultBSymbol = action.payload;
    },
    setVaultBShare: (state, action) =>{
      state.vaultBShare = action.payload;
    },
    vaultBBalanceLoaded: (state, action) => {
      state.vaultBBalance = action.payload;
    },
    vaultBLockStatusLoaded: (state, action) => {
      state.locked = action.payload;
    },
    depositRequest: (state, action) => {
      state.depositing.isDepositing = true;
      state.depositing.isSuccess = false;
      state.depositing.transactionHash = null;
    },
    depositSuccess: (state, action) => {
      state.depositing.isDepositing = false;
      state.depositing.isSuccess = true;
      state.depositing.transactionHash = action.payload;
    },
    depositFail: (state, action) => {
      state.depositing.isDepositing = false;
      state.depositing.isSuccess = false;
      state.depositing.transactionHash = null;
    },
    repaymentRequest: (state, action) => {
      state.repaying.isRepaying = true;
      state.repaying.isSuccess = false;
      state.repaying.transactionHash = null;
    },
    repaymentSuccess: (state, action) => {
      state.repaying.isRepaying = false;
      state.repaying.isSuccess = true;
      state.repaying.transactionHash = action.payload;
    },
    repaymentFail: (state, action) => {
      state.repaying.isRepaying = false;
      state.repaying.isSuccess = false;
      state.repaying.transactionHash = null;
    },
    WithdrawRequest: (state, action) => {
      state.withdrawing.isWithdrawing = true;
      state.withdrawing.isSuccess = false;
      state.withdrawing.transactionHash = null;
    },
    WithdrawSuccess: (state, action) => {
      state.withdrawing.isWithdrawing = false;
      state.withdrawing.isSuccess = true;
      state.withdrawing.transactionHash = action.payload;
    },
    WithdrawFail: (state, action) => {
      state.withdrawing.isWithdrawing = false;
      state.withdrawing.isSuccess = false;
      state.withdrawing.transactionHash = null;
    },
  },
});

export const { 
  setVaultBContract, 
  setVaultBSymbol,
  setVaultBShare,
  vaultBBalanceLoaded, 
  vaultBLockStatusLoaded, 
  depositRequest,
  depositSuccess,
  depositFail,
  repaymentRequest,
  repaymentFail,
  repaymentSuccess, 
  WithdrawRequest,  
  WithdrawFail, 
  WithdrawSuccess 
} = VaultB.actions;

export default VaultB.reducer;
