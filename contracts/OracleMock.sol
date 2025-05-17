// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IYieldStrategy {
    function getCurrentAPY() external view returns (uint256);
}

contract OracleMock {
    mapping(address => bool) public isStrategy;

    constructor(address[] memory _strategies) {
        for (uint256 i = 0; i < _strategies.length; i++) {
            isStrategy[_strategies[i]] = true;
        }
    }

    function getAPY(address strategy) external view returns (uint256) {
        require(isStrategy[strategy], "Unknown strategy");
        return IYieldStrategy(strategy).getCurrentAPY();
    }

    function addStrategy(address strategy) external {
        isStrategy[strategy] = true;
    }

    function removeStrategy(address strategy) external {
        isStrategy[strategy] = false;
    }
}