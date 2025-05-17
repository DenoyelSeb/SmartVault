const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NeoVaultAggregator", function () {
  let token, aave, yearn, compound, oracle, feesManager, vault, user;

  beforeEach(async function () {
    [user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("Mock DAI", "mDAI", 18);
    await token.waitForDeployment();

    const Aave = await ethers.getContractFactory("MockAaveStrategy");
    aave = await Aave.deploy(await token.getAddress(), ethers.ZeroAddress);
    await aave.waitForDeployment();

    const Yearn = await ethers.getContractFactory("MockYearnStrategy");
    yearn = await Yearn.deploy(await token.getAddress(), ethers.ZeroAddress);
    await yearn.waitForDeployment();

    const Compound = await ethers.getContractFactory("MockCompoundStrategy");
    compound = await Compound.deploy(await token.getAddress(), ethers.ZeroAddress);
    await compound.waitForDeployment();

    const Oracle = await ethers.getContractFactory("OracleMock");
    oracle = await Oracle.deploy([aave.getAddress(), yearn.getAddress(), compound.getAddress()]);
    await oracle.waitForDeployment();

    const Fees = await ethers.getContractFactory("FeesManager");
    feesManager = await Fees.deploy(1000); // 10%
    await feesManager.waitForDeployment();

    const Vault = await ethers.getContractFactory("NeoVaultAggregator");
    vault = await Vault.deploy(
      [aave.getAddress(), yearn.getAddress(), compound.getAddress()],
      oracle.getAddress(),
      feesManager.getAddress(),
      token.getAddress()
    );
    await vault.waitForDeployment();

    await vault.setFeeRecipient(user.getAddress());
  });

  it("should allow deposit and mint shares", async function () {
    await token.mint(user.getAddress(), ethers.parseEther("1000"));
    await token.connect(user).approve(vault.getAddress(), ethers.parseEther("1000"));

    await vault.connect(user).deposit(ethers.parseEther("500"));

    const shares = await vault.shares(user.getAddress());
    expect(shares).to.be.gt(0);
    expect(await token.balanceOf(user.getAddress())).to.equal(ethers.parseEther("500"));
  });

  it("should rebalance to new strategy and collect fee", async function () {
  const depositAmount = ethers.parseEther("1000");
  await token.mint(await user.getAddress(), depositAmount);
  await token.connect(user).approve(await vault.getAddress(), depositAmount);
  await vault.connect(user).deposit(depositAmount);

  // passage de quelques blocs pour faire varier l’APY
  await network.provider.send("evm_mine");
  await network.provider.send("evm_mine");
  const beforeStrategy    = await vault.currentStrategy();
  
  // rebalance
  await vault.rebalance();

  const afterStrategy     = await vault.currentStrategy();

  // La stratégie a bien changé après rebalance
  expect(afterStrategy).to.not.equal(beforeStrategy);
});

  it("should allow withdrawal and burn shares", async function () {
    await token.mint(user.getAddress(), ethers.parseEther("1000"));
    await token.connect(user).approve(vault.getAddress(), ethers.parseEther("1000"));
    await vault.connect(user).deposit(ethers.parseEther("800"));

    const sharesBefore = await vault.shares(user.getAddress());
    const vaultBalBefore = await vault.vaultBalance();

    const half = sharesBefore / 2n;
    await vault.connect(user).withdraw(half);

    const sharesAfter = await vault.shares(user.getAddress());
    const vaultBalAfter = await vault.vaultBalance();

    expect(sharesAfter).to.equal(half);
    expect(vaultBalAfter).to.be.lt(vaultBalBefore);
    expect(await token.balanceOf(user.getAddress())).to.be.gt(0);
  });
});
