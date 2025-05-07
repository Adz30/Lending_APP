// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {VAULT_A} from "contracts/VAULT_A.sol";
import {VAULT_B} from "contracts/VAULT_B.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VAULT_CONTROLLER is Ownable {
    VAULT_A public vaultA;
    VAULT_B public vaultB;

    mapping(address => uint256) public collateralDeposited;
    mapping(address => uint256) public loanBalances;
    mapping(address => uint256) public loanStartTime;
    mapping(address => bool) public locked;
    mapping(address => uint256) public liquidatedAssets;

    event CollateralDeposited(address indexed borrower, uint256 amount);
    event LoanIssued(
        address indexed borrower,
        uint256 amount,
        uint256 timestamp
    );
    event liquidated(address indexed borrower, uint256 amount);

    // Constructor that sets the initialOwner and calls Ownable's constructor
    constructor(address initialOwner) Ownable(initialOwner) {
        // Now the contract is initialized with the given initialOwner
    }

    // Setters for Vault addresses
    function setVaultA(address _vaultA) public onlyOwner {
        vaultA = VAULT_A(_vaultA);
    }

    function setVaultB(address _vaultB) public onlyOwner {
        vaultB = VAULT_B(_vaultB);
    }

    // Calculates loan based on collateral and auto-issues the loan
    function calculateCollateralAmount(
        address _borrower,
        uint256 collateralAmount
    ) public returns (uint256) {
        uint256 minLoanAmount = 10 * (10 ** 18); // 10 tokens (adjust for decimals if needed)
        require(collateralAmount > 0, "Collateral must be > 0");

        collateralDeposited[_borrower] += collateralAmount;
        emit CollateralDeposited(_borrower, collateralAmount);

        uint256 loanAmount = (collateralAmount * 90) / 100;

        require(
            loanAmount >= minLoanAmount,
            "Loan amount must be at least 10 tokens"
        );

        bool success = _sendLoanTokens(_borrower, loanAmount);
        require(success, "Loan failed");

        return loanAmount;
    }

    // Internal function to send loan tokens
    function _sendLoanTokens(
        address _borrower,
        uint256 loanAmount
    ) internal returns (bool) {
        require(loanAmount > 0, "Loan amount must be > 0");

        bool success = vaultA.loanTokens(_borrower, loanAmount);
        require(success, "Loan issuance failed");

        loanBalances[_borrower] += loanAmount;

        lock(_borrower);

        loanStartTime[_borrower] = block.timestamp;

        emit LoanIssued(_borrower, loanAmount, block.timestamp);

        return true;
    }
    function updatedLoansPaid(address _borrower) external {
        require(msg.sender == address(vaultA), "Not authorized");
        loanBalances[_borrower] = 0;
        unlock(_borrower);
    }
    function liquidate(address borrower) external {
        require(locked[borrower], "user is not locked");
        require(
            block.timestamp > loanStartTime[borrower] + 7 days,
            "loan not overdue"
        );

        uint256 collateralAmount = collateralDeposited[borrower];

        require(collateralAmount > 0, "No collateral to liquidate");

        // call vault b function to burn shares
        vaultB.forceWithdrawCollateral(borrower);
        vaultA.updateLiquidations(borrower);

        liquidatedAssets[borrower] += collateralAmount;

        emit liquidated(borrower, collateralAmount);

        //clear loan from logs and unlock vault for user

        locked[borrower] = false;
        loanBalances[borrower] = 0;
        collateralDeposited[borrower] = 0;
        loanStartTime[borrower] = 0;
    }
    function getLiquidatedAssets(
        address borrower
    ) public view returns (uint256) {
        return liquidatedAssets[borrower];
    }
    // Call this when a loan is issued
    function lock(address user) internal {
        locked[user] = true;
        vaultB.setLocked(user, true);
    }

    // Call this when a loan is repaid
    function unlock(address user) internal {
        locked[user] = false;
        vaultB.setLocked(user, false);
    }

    // Vault B will call this
    function isLocked(address user) public view returns (bool) {
        return locked[user];
    }
}
