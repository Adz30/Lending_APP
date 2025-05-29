// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract Faucet  is ReentrancyGuard {
    uint256 public constant tokenAmountA = 100 * 1e18; // 100 tokens
    uint256 public constant tokenAmountB = 100 * 1e18; // 100 tokens
    uint256 public constant cooldown = 1 days; // 24 hours

    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;

    mapping(address => uint256) public lastRequestTime;

    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function requestTokens() external nonReentrant {
        require(block.timestamp >= lastRequestTime[msg.sender] + cooldown, "Please wait 24 hours");

        require(tokenA.balanceOf(address(this)) >= tokenAmountA, "Not enough Token A");
        require(tokenB.balanceOf(address(this)) >= tokenAmountB, "Not enough Token B");

        lastRequestTime[msg.sender] = block.timestamp;

        tokenA.transfer(msg.sender, tokenAmountA);
        tokenB.transfer(msg.sender, tokenAmountB);
    }
}