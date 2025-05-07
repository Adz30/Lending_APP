import { createSlice } from '@reduxjs/toolkit';

export const VaultA = createSlice({
  name: 'VaultA',
  initialState: {
    VAULT_A: null,
    VaultASymbol: null,
    vaultABalance: 0,
    vaultAShare: 0,
    repaymentAmount: null,
    loanHistory: [],  // Tracks loan status (paid, unpaid, etc.)

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
    setVaultAContract: (state, action) => {
      state.VAULT_A = action.payload;
    },
    setVaultASymbol: (state, action) => {
      state.VaultASymbol = action.payload;
    },
    vaultABalanceLoaded: (state, action) => {
      state.vaultABalance = action.payload;
    },
    setVaultAShare: (state, action) => {
      state.vaultAShare = action.payload;
    },
    setRepaymentAmount(state, action) {
      state.repaymentAmount = action.payload;
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
    withdrawRequest: (state, action) => {
      state.withdrawing.isWithdrawing = true;
      state.withdrawing.isSuccess = false;
      state.withdrawing.transactionHash = null;
    },
    withdrawSuccess: (state, action) => {
      state.withdrawing.isWithdrawing = false;
      state.withdrawing.isSuccess = true;
      state.withdrawing.transactionHash = action.payload;
    },
    withdrawFail: (state, action) => {
      state.withdrawing.isWithdrawing = false;
      state.withdrawing.isSuccess = false;
      state.withdrawing.transactionHash = null;
    },

    // New action to update loan status
    updateLoanStatus: (state, action) => {
      const { loanId, newStatus } = action.payload;
      const loan = state.loanHistory.find(loan => loan.id === loanId);
      if (loan) {
        loan.status = newStatus;  // Update the loan's status (e.g., paid)
      }
    },

    // Action to add a loan to history
    addLoanEvent: (state, action) => {
      state.loanHistory.push(action.payload);
    },

    // Optional: Clear loan history (could be useful for resetting state)
    clearLoanHistory: (state) => {
      state.loanHistory = [];
    }
  }
});

export const {
  setVaultAContract,
  setVaultASymbol,
  setVaultAShare,
  setRepaymentAmount,
  vaultABalanceLoaded,
  depositRequest,
  depositSuccess,
  depositFail,
  repaymentRequest,
  repaymentSuccess,
  repaymentFail,
  withdrawRequest,
  withdrawSuccess,
  withdrawFail,
  updateLoanStatus,
  addLoanEvent,
  clearLoanHistory
} = VaultA.actions;

export default VaultA.reducer;
