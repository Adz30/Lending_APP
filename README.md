💸 Decentralized Lending Application

A decentralized finance (DeFi) lending app built with **Solidity**, **React.js**, and **JavaScript**.  
Users can deposit tokens into **ERC-4626 vaults**, borrow against collateral, and repay loans — with smart contract-enforced **time-based liquidations** (backend fully implemented, frontend coming soon).

---

## 🌐 Live Demo & Faucet

Try the app live at:  
👉 [https://lendingapp.on-fleek.app/](https://lendingapp.on-fleek.app/)  

The website includes a **token faucet** allowing you to mint test tokens and interact with the vaults without needing any external tokens. Perfect for testing deposits, loans, and repayments in a risk-free environment.

---

## 📝 How to Use the App

1. **Get test tokens**  
   Use the built-in faucet on the website to mint tokens for both Vault A and Vault B.

2. **Deposit Tokens into Vault A**  
   Earn interest by lending tokens to the pool.

3. **Borrow Tokens Using Vault B Collateral**  
   Lock your collateral tokens in Vault B and borrow tokens against them.

4. **Repay Loan Before Expiry**  
   Repay your loan any time before expiry to unlock collateral and avoid liquidation.

---

## 🎥 Demo Video

Watch a quick demo of the lending app in action:  

[![Lending App Demo](https://img.youtube.com/vi/5J0tUxdQkwU/maxresdefault.jpg)](https://youtu.be/5J0tUxdQkwU)  

*Click the image to watch the video.*

---

## ⚙️ Features

- 🏦 **Dual ERC-4626 Vaults**  
  - *Vault A*: Lending vault for deposits and loan issuance  
  - *Vault B*: Collateral vault securing borrowers’ assets  

- 🎮 **Vault Controller Contract**  
  Manages user lock states and performs loan liquidations upon expiry  

- 🪙 **Two ERC-20 Test Tokens**  
  Available from faucet to simulate real-world lending scenarios  

- 🧨 **On-Chain Time-Based Loan Liquidation**  
  Loans are liquidated automatically when overdue  

- 🖥 **Frontend**  
  React.js with Redux for smooth user experience and state management  

---

## ⚠️ Loan Liquidation Process

Loans have a predefined duration. The system enforces liquidation automatically through the following steps:

1. **Loan Issuance**  
   When a borrower takes a loan, their collateral is locked in Vault B and the loan start timestamp is recorded.

2. **Loan Monitoring**  
   The Vault Controller tracks loan timestamps and checks if the loan has expired.

3. **Time-Based Liquidation**  
   If a loan is not repaid before the expiry:  
   - The borrower’s shares in Vault B are burned.  
   - Collateral tokens are transferred from Vault B to the Vault Controller contract.  
   - The borrower’s loan and collateral are effectively liquidated to protect lenders.

4. **Repayment Before Expiry**  
   Borrowers can repay their loans at any time before expiry to unlock their collateral and avoid liquidation.

---

### ⚠️ Note on Frontend Liquidation Support

The **time-based liquidation logic is fully implemented and enforced on-chain** via smart contracts.  
However, **the frontend currently does not provide a UI for manual or automatic liquidation actions**. This feature will be integrated in a future update to improve user experience and transparency.

---

## 🚀 Quick Start Guide (For Local Development)

### Prerequisites

- Node.js (v16 or above recommended)  
- npm or yarn  
- Hardhat
- metamask account https://metamask.io/

### Steps

1. **Install dependencies**  
npm install

2. **Run smart contract tests**
npx hardhat test

3 **Start local blockchain**
npx hardhat node

4 **Deploy contracts**
npx hardhat run scripts/deploy.js --network localhost

5 **Update config.json**
Add deployed contract addresses to the config file for the frontend to connect properly.

6 **Start frontend**
npm run start

🛠️ Project Structure
/contracts — Solidity contracts for vaults, tokens, and controllers

/scripts — Deployment and utility scripts

/test — Hardhat tests ensuring contract correctness

/frontend — React app with Redux state management

🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.

📄 License
This project is licensed under the MIT License.
