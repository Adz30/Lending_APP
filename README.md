 💸 Lending Application

A decentralized finance (DeFi) lending app built with **Solidity**, **React.js**, and **JavaScript**. Users can deposit into ERC-4626 vaults, borrow against collateral, and repay loans — with smart contract-enforced liquidation (backend only, frontend coming soon).

---

## ⚙️ Features

- 🏦 Two ERC-4626 Vaults (Vault A: Lending, Vault B: Collateral)
- 🎮 Vault Controller smart contract (manages locks & liquidations)
- 🪙 Two ERC-20 test tokens
- 🧨 Time-based loan liquidation (implemented in contracts)
- 🖥 Frontend built in React with Redux for state management

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run tests
npx hardhat test

# Start Hardhat local network
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Add deployed contract addresses to config.json

# Launch frontend
npm run start
