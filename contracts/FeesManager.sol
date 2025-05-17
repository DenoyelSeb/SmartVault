// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FeesManager {
    address public owner;
    uint256 public performanceFee; // ex: 1000 = 10% (base 10000)

    event FeeUpdated(uint256 newFee);
    event FeeCollected(uint256 profit, uint256 fee);

    constructor(uint256 _performanceFee) {
        require(_performanceFee <= 5000, "Too high"); // max 50%
        owner = msg.sender;
        performanceFee = _performanceFee;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setPerformanceFee(uint256 newFee) external onlyOwner {
        require(newFee <= 5000, "Too high");
        performanceFee = newFee;
        emit FeeUpdated(newFee);
    }

    function collectFee(uint256 profit) external returns (uint256) {
        if (profit == 0) return 0;
        uint256 fee = (profit * performanceFee) / 10000;
        emit FeeCollected(profit, fee);
        return fee;
    }
}