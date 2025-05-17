// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ERC20Mock.sol";

contract MockAaveStrategy {
    IERC20 public underlying;
    address public vault;
    uint256 public totalAssets;
    uint256 public lastYieldBlock;

    constructor(address _underlying, address _vault) {
        underlying = IERC20(_underlying);
        vault = _vault;
        lastYieldBlock = block.number;
    }

    function deposit(uint256 amount) external {
        simulateYield();
        require(underlying.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        totalAssets += amount;
    }

    function withdraw(uint256 amount) external {
        simulateYield();
        require(msg.sender == vault || vault == address(0), "Only vault");
        require(totalAssets >= amount, "Not enough");
        totalAssets -= amount;
        require(underlying.transfer(msg.sender, amount), "Withdraw transfer failed");
    }

    function balance() external view returns (uint256) {
        uint256 blocksElapsed = block.number - lastYieldBlock;
        uint256 pseudoAPY = getCurrentAPY();
        uint256 yieldGain = (totalAssets * pseudoAPY * blocksElapsed) / 1e6 / 1000;
        return totalAssets + yieldGain;
    }

    function simulateYield() public {
        uint256 blocksElapsed = block.number - lastYieldBlock;
        if (blocksElapsed == 0) {
            return;
        }

        uint256 pseudoAPY = getCurrentAPY();
        uint256 yieldGain = (totalAssets * pseudoAPY * blocksElapsed) / 1e6 / 1000;

        if (yieldGain > 0) {
            totalAssets += yieldGain;
            ERC20Mock(address(underlying)).mint(address(this), yieldGain);
        }

        lastYieldBlock = block.number;
    }

    function getCurrentAPY() public view returns (uint256) {
        return 300 + (uint256(keccak256(abi.encodePacked(block.number, address(this)))) % 300);
        // APY between 3% and 6%
    }
}