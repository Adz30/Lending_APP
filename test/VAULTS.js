const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => ethers.utils.parseUnits(n.toString(), "ether");

describe("VAULTS", () => {
  let deployer, user1, user2, TOKEN_A, TOKEN_B, vaultA, vaultB, vaultController;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];

    const TokenA = await ethers.getContractFactory("TOKEN_A");
    TOKEN_A = await TokenA.deploy("TOKEN_A", "TKNA", tokens(1000000));
    await TOKEN_A.deployed();

    const TokenB = await ethers.getContractFactory("TOKEN_B");
    TOKEN_B = await TokenB.deploy("TOKEN_B", "TKNB", tokens(1000000));
    await TOKEN_B.deployed();

    const VaultController = await ethers.getContractFactory("VAULT_CONTROLLER");
    vaultController = await VaultController.deploy(deployer.address);
    await vaultController.deployed();

    const VaultA = await ethers.getContractFactory("VAULT_A");
    vaultA = await VaultA.deploy(
      "Vault A",
      "VA",
      TOKEN_A.address,
      vaultController.address
    );
    await vaultA.deployed();

    const VaultB = await ethers.getContractFactory("VAULT_B");
    vaultB = await VaultB.deploy(
      "Vault B",
      "VB",
      TOKEN_B.address,
      vaultController.address
    );
    await vaultB.deployed();

    await vaultController.setVaultA(vaultA.address);
    await vaultController.setVaultB(vaultB.address);

    await TOKEN_A.transfer(user1.address, tokens(1000));
    await TOKEN_B.transfer(user2.address, tokens(1000));
  });

  it("Deployment info", async () => {
    const user1Balance = await TOKEN_A.balanceOf(user1.address);
    const user2Balance = await TOKEN_B.balanceOf(user2.address);
    expect(user1Balance).to.equal(tokens(1000));
    expect(user2Balance).to.equal(tokens(1000));
  });

  describe("Deployment", () => {
    it("sets the correct asset for Vault A", async () => {
      expect(await vaultA.asset()).to.equal(TOKEN_A.address);
    });

    it("Vault A has name and symbol", async () => {
      const name = await vaultA.name();
      const symbol = await vaultA.symbol();
      expect(name).to.equal("Vault A");
      expect(symbol).to.equal("VA");
    });

    it("sets the correct asset for Vault B", async () => {
      expect(await vaultB.asset()).to.equal(TOKEN_B.address);
    });

    it("Vault B has name and symbol", async () => {
      const name = await vaultB.name();
      const symbol = await vaultB.symbol();
      expect(name).to.equal("Vault B");
      expect(symbol).to.equal("VB");
    });
  });

  describe("Vault A Activity", () => {
    describe("Success", () => {
      it("User1 deposits 200 TKNA and receives shares", async () => {
        const amount = tokens(200);
        await TOKEN_A.connect(user1).approve(vaultA.address, amount);
        await expect(vaultA.connect(user1).deposit(amount, user1.address))
          .to.emit(vaultA, "Deposit")
          .withArgs(user1.address, user1.address, amount, amount);

        const totalAssets = await vaultA.totalAssets();
        const maxRedeem = await vaultA.maxRedeem(user1.address);

        expect(await vaultA.balanceOf(user1.address)).to.be.gt(0);
        expect(totalAssets).to.be.gt(0);
        expect(maxRedeem).to.be.gt(0);
      });

      it("User1 deposits twice and assets increase", async () => {
        const amount = tokens(200);
        await TOKEN_A.connect(user1).approve(vaultA.address, amount.mul(2));
        await vaultA.connect(user1).deposit(amount, user1.address);
        await vaultA.connect(user1).deposit(amount, user1.address);

        const totalAssets = await vaultA.totalAssets();
        const maxRedeem = await vaultA.maxRedeem(user1.address);

        expect(await vaultA.balanceOf(user1.address)).to.be.gt(0);
        expect(totalAssets).to.be.gt(0);
        expect(maxRedeem).to.be.gt(0);
      });

      it("User1 deposits 200 TKNA then redeems all shares", async () => {
        const amount = tokens(200);
        await TOKEN_A.connect(user1).approve(vaultA.address, amount);
        await vaultA.connect(user1).deposit(amount, user1.address);

        const shares = await vaultA.balanceOf(user1.address);
        await vaultA
          .connect(user1)
          .redeem(shares, user1.address, user1.address);

        expect(await vaultA.balanceOf(user1.address)).to.equal(0);
      });

      it("checks for loan token functions", async () => {
        const amount = tokens(300);
        const collateralAmount = tokens(100);
        const loanAmount = tokens(90);

        await TOKEN_A.connect(user1).transfer(vaultA.address, amount);

        const controllerAddress = await vaultA.vaultController();
        expect(controllerAddress).to.equal(vaultController.address);

        const transaction = await vaultController
          .connect(deployer)
          .calculateCollateralAmount(user2.address, collateralAmount);
        await transaction.wait();

        const after = await TOKEN_A.balanceOf(user2.address);
        expect(after.toString()).to.equal(
          loanAmount.toString(),
          "Loan amount mismatch"
        );

        const borrower0 = await vaultA.borrowers(0);
        expect(borrower0).to.equal(
          user2.address,
          "Borrower not correctly added"
        );
      });

      it("checks for loan repayment functions", async () => {
        const amount = tokens(300);
        const collateralAmount = tokens(300);
        const loanAmount = tokens(270);
        const plusFee = tokens(30);
        const redepositAmount = tokens(10);

        const depositForShares = tokens(150);
        await TOKEN_A.connect(user1).approve(vaultA.address, depositForShares);
        await expect(
          vaultA.connect(user1).deposit(depositForShares, user1.address)
        )
          .to.emit(vaultA, "Deposit")
          .withArgs(
            user1.address,
            user1.address,
            depositForShares,
            depositForShares
          );

        const totalAssets = await vaultA.totalAssets();
        const maxRedeem = await vaultA.maxRedeem(user1.address);

        expect(await vaultA.balanceOf(user1.address)).to.be.gt(0);
        expect(totalAssets).to.be.gt(0);
        expect(maxRedeem).to.be.gt(0);

        await TOKEN_A.connect(user1).transfer(vaultA.address, amount);

        const controllerAddress = await vaultA.vaultController;
        expect(await vaultA.vaultController()).to.equal(
          vaultController.address
        );

        const transaction = await vaultController
          .connect(deployer)
          .calculateCollateralAmount(user2.address, collateralAmount);
        await transaction.wait();

        const after = await TOKEN_A.balanceOf(user2.address);
        expect(after.toString()).to.equal(
          loanAmount.toString(),
          "Loan amount mismatch"
        );

        const borrower0 = await vaultA.borrowers(0);
        expect(borrower0).to.equal(
          user2.address,
          "Borrower not correctly added"
        );

        await TOKEN_A.connect(user1).transfer(user2.address, plusFee);

        const totalRepaymentAmount = await vaultA._calculateRepaymentAmount(
          user2.address
        );

        const approvalAmount = tokens(500); // Approve 500 tokens for repayment
        await TOKEN_A.connect(user2).approve(vaultA.address, approvalAmount);

        const allowanceAfter = await TOKEN_A.allowance(
          user2.address,
          vaultA.address
        );

        expect(
          allowanceAfter.gte(totalRepaymentAmount),
          "Allowance is not sufficient"
        ).to.be.true;

        const success = await vaultA
          .connect(user2)
          .callStatic.repayLoan(totalRepaymentAmount, user2.address);
        expect(success).to.be.true;

        const tx = await vaultA
          .connect(user2)
          .repayLoan(totalRepaymentAmount, user2.address);
        await tx.wait();

        const anyDebtOwned = await vaultA._calculateRepaymentAmount(
          user2.address
        );
        expect(anyDebtOwned).to.equal(0);

        const afterPayment = await TOKEN_A.balanceOf(user2.address);
        expect(afterPayment).to.be.lt(tokens(1000));
        expect(await vaultA.loanIssued(user2.address)).to.equal(0);
        expect(await vaultA.repaymentAmounts(user2.address)).to.equal(0);

        await expect(tx)
          .to.emit(vaultA, "LoanRepaid")
          .withArgs(user2.address, totalRepaymentAmount);

        const shares = await vaultA.balanceOf(user1.address);
        await vaultA
          .connect(user1)
          .redeem(shares, user1.address, user1.address);

        expect(await vaultA.balanceOf(user1.address)).to.equal(0);
      });
      it("user1 withdraws their assets after user2 loan repayment", async () => {
        const amount = tokens(200);
        const vaultSupply = tokens(300);
        const collateralAmount = tokens(300);
        const loanAmount = tokens(270);
        const plusFee = tokens(30);

        await TOKEN_A.connect(user1).approve(vaultA.address, amount);

        // Deposit and emit event
        await expect(vaultA.connect(user1).deposit(amount, user1.address))
          .to.emit(vaultA, "Deposit")
          .withArgs(user1.address, user1.address, amount, amount);

        const depositForShares = tokens(150);
        await TOKEN_A.connect(user1).approve(vaultA.address, depositForShares);
        await expect(
          vaultA.connect(user1).deposit(depositForShares, user1.address)
        )
          .to.emit(vaultA, "Deposit")
          .withArgs(
            user1.address,
            user1.address,
            depositForShares,
            depositForShares
          );

        const totalAssets = await vaultA.totalAssets();
        const maxRedeem = await vaultA.maxRedeem(user1.address);

        expect(await vaultA.balanceOf(user1.address)).to.be.gt(0);
        expect(totalAssets).to.be.gt(0);
        expect(maxRedeem).to.be.gt(0);

        await TOKEN_A.connect(user1).transfer(vaultA.address, vaultSupply);

        const controllerAddress = await vaultA.vaultController();
        expect(controllerAddress).to.equal(vaultController.address);

        const transaction = await vaultController
          .connect(deployer)
          .calculateCollateralAmount(user2.address, collateralAmount);
        await transaction.wait();

        const after = await TOKEN_A.balanceOf(user2.address);
        expect(after.toString()).to.equal(
          loanAmount.toString(),
          "Loan amount mismatch"
        );

        const borrower0 = await vaultA.borrowers(0);
        expect(borrower0).to.equal(
          user2.address,
          "Borrower not correctly added"
        );

        await TOKEN_A.connect(user1).transfer(user2.address, plusFee);

        const totalRepaymentAmount = await vaultA._calculateRepaymentAmount(
          user2.address
        );

        const approvalAmount = tokens(500); // Approve 500 tokens for repayment
        await TOKEN_A.connect(user2).approve(vaultA.address, approvalAmount);

        const allowanceAfter = await TOKEN_A.allowance(
          user2.address,
          vaultA.address
        );

        expect(
          allowanceAfter.gte(totalRepaymentAmount),
          "Allowance is not sufficient"
        ).to.be.true;

        const success = await vaultA
          .connect(user2)
          .callStatic.repayLoan(totalRepaymentAmount, user2.address);
        expect(success).to.be.true;

        const tx = await vaultA
          .connect(user2)
          .repayLoan(totalRepaymentAmount, user2.address);

        await tx.wait();

        const anyDebtOwned = await vaultA._calculateRepaymentAmount(
          user2.address
        );
        expect(anyDebtOwned).to.equal(0);

        const afterPayment = await TOKEN_A.balanceOf(user2.address);
        expect(afterPayment).to.be.lt(tokens(1000));
        expect(await vaultA.loanIssued(user2.address)).to.equal(0);
        expect(await vaultA.repaymentAmounts(user2.address)).to.equal(0);

        await expect(tx)
          .to.emit(vaultA, "LoanRepaid")
          .withArgs(user2.address, totalRepaymentAmount);

        const shares = await vaultA.balanceOf(user1.address);
        await vaultA
          .connect(user1)
          .redeem(shares, user1.address, user1.address);

        expect(await vaultA.balanceOf(user1.address)).to.equal(0);
      });
    });

    describe("Failure", () => {
      it("Rejects deposit of wrong asset (TKNB into Vault A)", async () => {
        const amount = tokens(200);
        await TOKEN_B.connect(user2).approve(vaultA.address, amount);
        await expect(vaultA.connect(user2).deposit(amount, user2.address)).to.be
          .reverted;
      });

      it("rejects call to redeem more shares than they have", async () => {
        const amount = tokens(200);

        await TOKEN_A.connect(user1).approve(vaultA.address, amount);
        await vaultA.connect(user1).deposit(amount, user1.address);

        const userShares = await vaultA.balanceOf(user1.address);
        await expect(
          vaultA
            .connect(user1)
            .redeem(userShares.add(1), user1.address, user1.address)
        ).to.be.reverted;
      });

      it("rejects if the vault doesnt have enough assets to lend", async () => {
        const depositAmount = tokens(100);
        const loanAmount = tokens(200);
        const collateralAmount = tokens(220);

        await TOKEN_A.connect(user1).transfer(vaultA.address, depositAmount);
        await expect(
          vaultController
            .connect(user2)
            .calculateCollateralAmount(user2.address, collateralAmount)
        ).to.be.revertedWith("Not enough token balance in vault");
      });
      it("rejects if the user doesn't have enough asset to pay loan", async () => {
        const vaultFundingAmount = tokens(300);
        const collateralAmount = tokens(100);
        const loanAmount = tokens(90);

        // Fund the vault so it can issue loans
        await TOKEN_A.connect(user1).transfer(
          vaultA.address,
          vaultFundingAmount
        );
        const vaultBalance = await TOKEN_A.balanceOf(vaultA.address);

        // Sanity check: Controller address
        const controller = await vaultA.vaultController();
        expect(controller).to.equal(vaultController.address);

        // Issue loan to user2 via calculateCollateralAmount
        await vaultController
          .connect(deployer)
          .calculateCollateralAmount(user2.address, collateralAmount);

        // Confirm loan was received
        const user2Loaned = await TOKEN_A.balanceOf(user2.address);
        expect(user2Loaned.toString()).to.equal(loanAmount.toString());

        // Get total repayment amount (including fees)
        const repaymentRequired = await vaultA._calculateRepaymentAmount(
          user2.address
        );

        // Give user2 extra tokens to simulate funds from another source
        const extraTokens = tokens(100);
        await TOKEN_A.connect(user1).transfer(user2.address, extraTokens);

        // Check user2 balance before draining
        let user2Bal = await TOKEN_A.balanceOf(user2.address);

        // Drain just enough from user2 so they're short by 1 token
        const toDrain = user2Bal.sub(repaymentRequired).add(tokens(1));
        await TOKEN_A.connect(user2).transfer(user1.address, toDrain);

        // Confirm new user2 balance
        user2Bal = await TOKEN_A.balanceOf(user2.address);

        // Approve repayment
        await TOKEN_A.connect(user2).approve(vaultA.address, repaymentRequired);
        const allowance = await TOKEN_A.allowance(
          user2.address,
          vaultA.address
        );

        // Expect transaction to revert due to insufficient balance
        await expect(
          vaultA.connect(user2).repayLoan(repaymentRequired, user2.address)
        ).to.be.revertedWith("need more funds");
      });
    });
  });
  describe("Vault B Activity", () => {
    describe("Success", () => {
      it("User2 deposits 200 TKNB and receives shares", async () => {
        const amount = tokens(200);
        await TOKEN_A.transfer(vaultA.address, ethers.utils.parseUnits("1000", 18));

        await TOKEN_B.connect(user2).approve(vaultB.address, amount);
        await expect(vaultB.connect(user2).deposit(amount, user2.address))
          .to.emit(vaultB, "Deposit")
          .withArgs(user2.address, user2.address, amount, amount);

        const totalAssets = await vaultB.totalAssets();
        const maxRedeem = await vaultB.maxRedeem(user2.address);

        expect(await vaultB.balanceOf(user2.address)).to.be.gt(0);
        expect(totalAssets).to.be.gt(0);
        expect(maxRedeem).to.be.gt(0);
      });

      
    
      
      it("check the liquidation system works ", async () => {
        // get loan using previous tests
        
        const amount = tokens(300);
        const collateralAmount = tokens(100);
        const loanAmount = tokens(90);
        await TOKEN_A.connect(user1).transfer(vaultA.address, amount);
       
        
        await TOKEN_B.connect(user2).approve(vaultB.address, collateralAmount);
        await expect(vaultB.connect(user2).deposit(collateralAmount, user2.address))
        .to.emit(vaultB, "Deposit")
        .withArgs(user2.address, user2.address, collateralAmount, collateralAmount);
        
        const totalAssets = await vaultB.totalAssets();
        const maxRedeem = await vaultB.maxRedeem(user2.address);
        
        expect(await vaultB.balanceOf(user2.address)).to.be.gt(0);
        expect(totalAssets).to.be.gt(0);
        expect(maxRedeem).to.be.gt(0);
        
        
        
        const controllerAddress = await vaultA.vaultController();
        expect(controllerAddress).to.equal(vaultController.address);
       
        
        const after = await TOKEN_A.balanceOf(user2.address);
        expect(after.toString()).to.equal(
          loanAmount.toString(),
          "Loan amount mismatch"
        );
        
        const borrower0 = await vaultA.borrowers(0);
        expect(borrower0).to.equal(
          user2.address,
          "Borrower not correctly added"
        );
        
        //get block.timestamp
        // Get loan start time
        const loanStartTime = await vaultController.loanStartTime(
          user2.address
        );
        
        
        // Increase time by 8 days
        await network.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
        await network.provider.send("evm_mine");
        
        // Get current block timestamp
        const latestBlock = await ethers.provider.getBlock("latest");
        
        
        // Calculate elapsed time
        const elapsedTime = latestBlock.timestamp - loanStartTime.toNumber();
        
        
        //call the liquidaiton function
        await expect(vaultController.connect(deployer).liquidate(user2.address))
        .to.emit(vaultController,"liquidated")
        .withArgs(user2.address, collateralAmount);
        
        const locked = await vaultController.locked(user2.address);
        const loanBalance = await vaultController.loanBalances(user2.address);
        const collateral = await vaultController.collateralDeposited(
          user2.address
        );
        const vaultAAssets = await vaultA.totalAssets()
        const expected = collateralAmount.add(amount).sub(loanAmount);
        
        expect(locked).to.be.false;
        expect(loanBalance).to.equal(0);
        expect(collateral).to.equal(0);
        expect(vaultAAssets).to.equal(expected);
        
        
        // await
      });
    });
    describe("failure", () => {
      it("Rejects deposit of wrong asset (TKNA into Vault B)", async () => {
        const amount = tokens(200);
        await TOKEN_A.connect(user1).approve(vaultB.address, amount);
        await expect(vaultB.connect(user1).deposit(amount, user1.address)).to.be
        .reverted;
      });
      
    
      it("rejects deposit into vaultB after loan has been paid", async () => {
        const amount = tokens(300);
        const collateralAmount = tokens(100);
        const loanAmount = tokens(90);
        
        await TOKEN_A.connect(user1).transfer(vaultA.address, amount);
        
        const controllerAddress = await vaultA.vaultController();
        expect(controllerAddress).to.equal(vaultController.address);
        
        const transaction = await vaultController
        .connect(deployer)
        .calculateCollateralAmount(user2.address, collateralAmount);
        await transaction.wait();
        
        const after = await TOKEN_A.balanceOf(user2.address);
        expect(after.toString()).to.equal(
          loanAmount.toString(),
          "Loan amount mismatch"
        );
        
        const borrower0 = await vaultA.borrowers(0);
        expect(borrower0).to.equal(
          user2.address,
          "Borrower not correctly added"
        );
        
        await TOKEN_B.connect(user2).approve(vaultB.address, amount);
        
        await expect(
          vaultB.connect(user2).deposit(amount, user2.address)
        ).to.be.revertedWith("User is locked due to an active loan");
      });
 
    });
  });
});
