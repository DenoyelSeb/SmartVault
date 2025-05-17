// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function balance() external view returns (uint256);
}

interface IOracle {
    function getAPY(address strategy) external view returns (uint256);
}

interface IFeesManager {
    function collectFee(uint256 profit) external returns (uint256);
}

contract NeoVaultAggregator {
    address public owner;
    address[] public strategies;
    address public currentStrategy;
    IOracle public oracle;
    IFeesManager public feesManager;
    address public feeRecipient;

    mapping(address => uint256) public shares;
    uint256 public totalShares;
    uint256 public lastVaultBalance;

    IERC20 public immutable underlying;

    constructor(
        address[] memory _strategies,
        address _oracle,
        address _feesManager,
        address _underlying
    ) {
        owner = msg.sender;
        strategies = _strategies;
        oracle = IOracle(_oracle);
        feesManager = IFeesManager(_feesManager);
        underlying = IERC20(_underlying);
        currentStrategy = _strategies[0];
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        uint256 sharesToMint;

        if (totalShares == 0 || vaultBalance() == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalShares) / vaultBalance();
        }

        underlying.transferFrom(msg.sender, address(this), amount);
        underlying.approve(currentStrategy, amount);
        IStrategy(currentStrategy).deposit(amount);

        shares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;

        lastVaultBalance = vaultBalance();
    }

    function withdraw(uint256 shareAmount) external {
        require(shareAmount > 0, "Invalid share amount");
        require(shares[msg.sender] >= shareAmount, "Not enough shares");

        uint256 amountToWithdraw = (vaultBalance() * shareAmount) / totalShares;
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;

        IStrategy(currentStrategy).withdraw(amountToWithdraw);
        underlying.transfer(msg.sender, amountToWithdraw);

        lastVaultBalance = vaultBalance();
    }

    function rebalance() external {

    address best = getBestStrategy();
    if (best == currentStrategy) {
        return;
    }

    uint256 balanceBefore = underlying.balanceOf(currentStrategy);
    IStrategy(currentStrategy).withdraw(balanceBefore);

    uint256 totalWithdrawn = underlying.balanceOf(address(this));
    uint256 profit        = 0;
    if (totalWithdrawn > lastVaultBalance) {
        profit = totalWithdrawn - lastVaultBalance;
    }

    uint256 fee = feesManager.collectFee(profit);
    if (fee > 0) {
        require(
            underlying.transfer(feeRecipient, fee),
            "Fee transfer failed"
        );
    }

    uint256 netToReinvest = totalWithdrawn - fee;
    underlying.approve(best, netToReinvest);
    IStrategy(best).deposit(netToReinvest);

    currentStrategy   = best;
    lastVaultBalance  = vaultBalance();
    }

    function getBestStrategy() public view returns (address best) {
        uint256 bestAPY = 0;
        for (uint256 i = 0; i < strategies.length; i++) {
            uint256 apy = oracle.getAPY(strategies[i]);
            if (apy > bestAPY) {
                bestAPY = apy;
                best = strategies[i];
            }
        }
    }

    function vaultBalance() public view returns (uint256) {
        if (currentStrategy == address(0)) return 0;
        return IStrategy(currentStrategy).balance();
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        feeRecipient = _recipient;
    }

    function addStrategy(address newStrategy) external onlyOwner {
        strategies.push(newStrategy);
    }
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}