// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {VAULT_CONTROLLER} from "contracts/VAULT_CONTROLLER.sol";
import {TOKEN_A} from "contracts/TOKEN_A.sol";
import "hardhat/console.sol";


/**
 * @dev Implementation of the ERC-4626 "Tokenized Vault Standard" as defined in
 * https://eips.ethereum.org/EIPS/eip-4626[ERC-4626].
 *
 * This extension allows the minting and burning of "shares" (represented using the ERC-20 inheritance) in exchange for
 * underlying "assets" through standardized {deposit}, {mint}, {redeem} and {burn} workflows. This contract extends
 * the ERC-20 standard. Any additional extensions included along it would affect the "shares" token represented by this
 * contract and not the "assets" token which is an independent contract.
 *
 * [CAUTION]
 * ====
 * In empty (or nearly empty) ERC-4626 vaults, deposits are at high risk of being stolen through frontrunning
 * with a "donation" to the vault that inflates the price of a share. This is variously known as a donation or inflation
 * attack and is essentially a problem of slippage. Vault deployers can protect against this attack by making an initial
 * deposit of a non-trivial amount of the asset, such that price manipulation becomes infeasible. Withdrawals may
 * similarly be affected by slippage. Users can protect against this attack as well as unexpected slippage in general by
 * verifying the amount received is as expected, using a wrapper that performs these checks such as
 * https://github.com/fei-protocol/ERC4626#erc4626router-and-base[ERC4626Router].
 *
 * Since v4.9, this implementation introduces configurable virtual assets and shares to help developers mitigate that risk.
 * The `_decimalsOffset()` corresponds to an offset in the decimal representation between the underlying asset's decimals
 * and the vault decimals. This offset also determines the rate of virtual shares to virtual assets in the vault, which
 * itself determines the initial exchange rate. While not fully preventing the attack, analysis shows that the default
 * offset (0) makes it non-profitable even if an attacker is able to capture value from multiple user deposits, as a result
 * of the value being captured by the virtual shares (out of the attacker's donation) matching the attacker's expected gains.
 * With a larger offset, the attack becomes orders of magnitude more expensive than it is profitable. More details about the
 * underlying math can be found xref:erc4626.adoc#inflation-attack[here].
 *
 * The drawback of this approach is that the virtual shares do capture (a very small) part of the value being accrued
 * to the vault. Also, if the vault experiences losses, the users try to exit the vault, the virtual shares and assets
 * will cause the first user to exit to experience reduced losses in detriment to the last users that will experience
 * bigger losses. Developers willing to revert back to the pre-v4.9 behavior just need to override the
 * `_convertToShares` and `_convertToAssets` functions.
 *
 * To learn more, check out our xref:ROOT:erc4626.adoc[ERC-4626 guide].
 * ====
 */
contract VAULT_A is ERC20, IERC4626 {
    using Math for uint256;

    VAULT_CONTROLLER public vaultController;
    address[] public borrowers;
    uint256 public totalInterest;
    address public admin;

    using SafeERC20 for IERC20;
    IERC20 public _asset;
    uint8 private _underlyingDecimals;

    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public loanIssued;
    mapping(address => uint256) public repaymentAmounts;

    event LoanIssued(
        address indexed to,
        uint256 loanAmount,
        uint256 totalRepaymentAmounts
    );
    event LoanRepaid(address indexed to, uint256 value);

    /**
     * @dev Attempted to deposit more assets than the max amount for `receiver`.
     */
    error ERC4626ExceededMaxDeposit(
        address receiver,
        uint256 assets,
        uint256 max
    );

    /**
     * @dev Attempted to mint more shares than the max amount for `receiver`.
     */
    error ERC4626ExceededMaxMint(address receiver, uint256 shares, uint256 max);

    /**
     * @dev Attempted to withdraw more assets than the max amount for `receiver`.
     */
    error ERC4626ExceededMaxWithdraw(
        address owner,
        uint256 assets,
        uint256 max
    );

    /**
     * @dev Attempted to redeem more shares than the max amount for `receiver`.
     */
    error ERC4626ExceededMaxRedeem(address owner, uint256 shares, uint256 max);

    /**
     * @dev Set the underlying asset contract. This must be an ERC20-compatible contract (ERC-20 or ERC-777).
     */

    constructor(
        string memory name_,
        string memory symbol_,
        IERC20 asset_,
        address _vaultController
    ) ERC20(name_, symbol_) {
        _underlyingDecimals = 18; // You can adjust this based on your asset's decimals
        _asset = asset_;
        vaultController = VAULT_CONTROLLER(_vaultController);
        admin = msg.sender;
    }
    modifier onlyController() {
        require(msg.sender == address(vaultController), "Not authorized");
        _;
    }
          modifier onlyAdmin() {
        require(msg.sender == admin, "Only the admin can call this function");
        _;
    }

    /**
     * @dev Attempts to fetch the asset decimals. A return value of false indicates that the attempt failed in some way.
     */
    function _tryGetAssetDecimals(
        IERC20 asset_
    ) private view returns (bool ok, uint8 assetDecimals) {
        (bool success, bytes memory encodedDecimals) = address(asset_)
            .staticcall(abi.encodeCall(IERC20Metadata.decimals, ()));
        if (success && encodedDecimals.length >= 32) {
            uint256 returnedDecimals = abi.decode(encodedDecimals, (uint256));
            if (returnedDecimals <= type(uint8).max) {
                return (true, uint8(returnedDecimals));
            }
        }
        return (false, 0);
    }

    /**
     * @dev Decimals are computed by adding the decimal offset on top of the underlying asset's decimals. This
     * "original" value is cached during construction of the vault contract. If this read operation fails (e.g., the
     * asset has not been created yet), a default of 18 is used to represent the underlying asset's decimals.
     *
     * See {IERC20Metadata-decimals}.
     */
    function decimals()
        public
        view
        virtual
        override(IERC20Metadata, ERC20)
        returns (uint8)
    {
        return _underlyingDecimals + _decimalsOffset();
    }

    /** @dev See {IERC4626-asset}. */
    function asset() public view virtual returns (address) {
        return address(_asset);
    }

    /** @dev See {IERC4626-totalAssets}. */
    function totalAssets() public view override returns (uint256) {
        uint256 totalVaultHoldings = _asset.balanceOf(address(this));
        uint256 totalLoanedAssets = 0;
        uint256 totalLiquidatedAssets = 0;

        // Loop through borrowers and add their loaned assets and liquidated assets
        for (uint256 i = 0; i < borrowers.length; i++) {
            address borrower = borrowers[i];
            totalLoanedAssets += loanIssued[borrower];
            totalLiquidatedAssets += vaultController.getLiquidatedAssets(
                borrower
            );
        }

        return totalVaultHoldings + totalLoanedAssets + totalLiquidatedAssets;
    }

    /** @dev See {IERC4626-totalAssets}. */

    /** @dev See {IERC4626-convertToShares}. */
    function convertToShares(
        uint256 assets
    ) public view virtual returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    /** @dev See {IERC4626-convertToAssets}. */
    function convertToAssets(
        uint256 shares
    ) public view virtual returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    /** @dev See {IERC4626-maxDeposit}. */
    function maxDeposit(address) public view virtual returns (uint256) {
        return type(uint256).max;
    }

    /** @dev See {IERC4626-maxMint}. */
    function maxMint(address) public view virtual returns (uint256) {
        return type(uint256).max;
    }

    /** @dev See {IERC4626-maxWithdraw}. */
    function maxWithdraw(address owner) public view virtual returns (uint256) {
        return _convertToAssets(balanceOf(owner), Math.Rounding.Floor);
    }

    /** @dev See {IERC4626-maxRedeem}. */
    function maxRedeem(address owner) public view virtual returns (uint256) {
        return balanceOf(owner);
    }

    /** @dev See {IERC4626-previewDeposit}. */
    function previewDeposit(
        uint256 assets
    ) public view virtual returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    /** @dev See {IERC4626-previewMint}. */
    function previewMint(uint256 shares) public view virtual returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Ceil);
    }

    /** @dev See {IERC4626-previewWithdraw}. */
    function previewWithdraw(
        uint256 assets
    ) public view virtual returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Ceil);
    }

    /** @dev See {IERC4626-previewRedeem}. */
   function previewRedeem(uint256 shares) public view override returns (uint256) {
    uint256 totalShares = totalSupply();
    if (totalShares == 0) return 0;

    // User gets proportional interest plus their original deposit portion
    uint256 userInterest = (shares * totalInterest) / totalShares;

    // We assume `_convertToAssets(shares)` used to reflect user's portion of all vault funds
    // Now we assume the base asset is their deposit *only* (not all vault funds)
    // So we treat shares as 1:1 with deposits for simplicity
    // Meaning user deposit value = shares, since you're tracking deposits separately
    return shares + userInterest;
}


    /** @dev See {IERC4626-deposit}. */
    function deposit(
        uint256 assets,
        address receiver
    ) public virtual returns (uint256) {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }

        uint256 shares = previewDeposit(assets);
        userDeposits[msg.sender] += assets;

        _deposit(_msgSender(), receiver, assets, shares);

        return shares;
    }

    /** @dev See {IERC4626-mint}. */
    function mint(
        uint256 shares,
        address receiver
    ) public virtual returns (uint256) {
        uint256 maxShares = maxMint(receiver);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxMint(receiver, shares, maxShares);
        }

        uint256 assets = previewMint(shares);
        _deposit(_msgSender(), receiver, assets, shares);

        return assets;
    }

    /** @dev See {IERC4626-withdraw}. */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual returns (uint256) {
        uint256 maxAssets = maxWithdraw(owner);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(owner, assets, maxAssets);
        }

        uint256 shares = previewWithdraw(assets);
        _withdraw(_msgSender(), receiver, owner, assets, shares);

        return shares;
    }

    /** @dev See {IERC4626-redeem}. */
   function redeem(
    uint256 shares,
    address receiver,
    address owner
    ) public returns (uint256) {
    require(shares > 0, "Zero shares");
    require(shares <= balanceOf(owner), "Exceeds share balance");

    // Calculate user’s base deposit per share
    uint256 userDeposit = userDeposits[owner];
    uint256 userShares = balanceOf(owner);
    uint256 baseAssets = (userDeposit * shares) / userShares;

    // Calculate proportional interest share
    uint256 interestShare = (shares * totalInterest) / totalSupply();

    uint256 totalAssetsToReturn = baseAssets + interestShare;

    // Burn the user's shares
    _burn(owner, shares);

    // Update user's deposit mapping
    userDeposits[owner] -= baseAssets;

    // Transfer base assets + interest to the receiver
    require(_asset.transfer(receiver, totalAssetsToReturn), "Transfer failed");

    emit Withdraw(msg.sender, receiver, owner, totalAssetsToReturn, shares);

    return totalAssetsToReturn;
}

    /**
     * @dev Internal conversion function (from assets to shares) with support for rounding direction.
     */
    function _convertToShares(
        uint256 assets,
        Math.Rounding rounding
    ) internal view virtual returns (uint256) {
        return
            assets.mulDiv(
                totalSupply() + 10 ** _decimalsOffset(),
                totalAssets() + 1,
                rounding
            );
    }

    /**
     * @dev Internal conversion function (from shares to assets) with support for rounding direction.
     */
    function _convertToAssets(
        uint256 shares,
        Math.Rounding rounding
    ) internal view virtual returns (uint256) {
        return
            shares.mulDiv(
                totalAssets() + 1,
                totalSupply() + 10 ** _decimalsOffset(),
                rounding
            );
    }

    /**
     * @dev Deposit/mint common workflow.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual {
        // If _asset is ERC-777, `transferFrom` can trigger a reentrancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, that is triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer before we mint so that any reentrancy would happen before the
        // assets are transferred and before the shares are minted, which is a valid state.
        // slither-disable-next-line reentrancy-no-eth
        SafeERC20.safeTransferFrom(_asset, caller, address(this), assets);
        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);
    }

    /**
     * @dev Withdraw/redeem common workflow.
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        // If _asset is ERC-777, `transfer` can trigger a reentrancy AFTER the transfer happens through the
        // `tokensReceived` hook. On the other hand, the `tokensToSend` hook, that is triggered before the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer after the burn so that any reentrancy would happen after the
        // shares are burned and after the assets are transferred, which is a valid state.
        _burn(owner, shares);
        SafeERC20.safeTransfer(_asset, receiver, assets);

        emit Withdraw(caller, receiver, owner, assets, shares);
    }

    function _decimalsOffset() internal view virtual returns (uint8) {
        return 0;
    }
function setFunds(uint256 amount) public onlyAdmin returns (bool) {
    require(msg.sender == admin, "Only admin can set funds");

    // ✅ Pull the funds from msg.sender
    _asset.transferFrom(msg.sender, address(this), amount);

    // ✅ (Optional) check: confirm amount received
    require(_asset.balanceOf(address(this)) >= amount, "Transfer failed");

    // ✅ Mint vault shares to the admin
    _mint(msg.sender, amount);

    return true;
}

    function _calculateRepaymentAmount(
        address borrower
    ) public view returns (uint256) {
        uint256 loanAmount = loanIssued[borrower]; // Access loan amount from the mapping
        uint256 fee = (loanAmount * 5) / 100; // 5% fee
        uint256 totalRepaymentAmount = loanAmount + fee;

        return totalRepaymentAmount;
    }
    function loanTokens(
        address borrower,
        uint256 loanAmount
    ) public onlyController returns (bool success) {
        // Ensure the vault has enough tokens to lend
        require(
            _asset.balanceOf(address(this)) >= loanAmount,
            "Not enough token balance in vault"
        );

        // If this is the borrower's first loan, add them to the borrowers list
        if (loanIssued[borrower] == 0) {
            borrowers.push(borrower);
        }

        loanIssued[borrower] += loanAmount;

        // Transfer loan amount to borrower
        _asset.transfer(borrower, loanAmount);

        uint256 totalRepaymentAmount = _calculateRepaymentAmount(borrower);
        repaymentAmounts[borrower] = totalRepaymentAmount;

        emit LoanIssued(borrower, loanAmount, totalRepaymentAmount);

        return true;
    }

    function repayLoan(uint256 amount, address borrower) public returns (bool) {
        //get amount due

        uint256 repaymentAmount = repaymentAmounts[msg.sender];

        require(repaymentAmount > 0, "no amount due");

        //make sure it has enough of a balance
        require(
            _asset.balanceOf(msg.sender) > repaymentAmount,
            "need more funds"
        );

        require(
            amount >= repaymentAmount,
            "Amount sent is less than the repayment amount"
        );

        // send tokens from account to this contract address
        bool success = _asset.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        uint256 principal = loanIssued[borrower];
        uint256 interest = repaymentAmount - principal;

        totalInterest += interest;

        //update mapping for loan repayed plus emit an event
        totalInterest += interest;
        repaymentAmounts[borrower] = 0;
        loanIssued[borrower] = 0;

        VAULT_CONTROLLER(vaultController).updatedLoansPaid(borrower);

        // Emit event
        emit LoanRepaid(borrower, amount);

        return true;
    }
    function updateLiquidations(
        address borrower
    ) external onlyController returns (bool) {
        repaymentAmounts[borrower] = 0;
        loanIssued[borrower] = 0;
        return true;
    }
}
