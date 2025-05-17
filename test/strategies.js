const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mock Strategies", function () {
  let aave, yearn, compound, user, token;

  beforeEach(async function () {
    [user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("Mock Token", "MTK", 18);
    await token.waitForDeployment();

    const dummyToken = await token.getAddress();
    const dummyVault = ethers.ZeroAddress;

    const Aave = await ethers.getContractFactory("MockAaveStrategy");
    aave = await Aave.deploy(dummyToken, dummyVault);
    await aave.waitForDeployment();

    const Yearn = await ethers.getContractFactory("MockYearnStrategy");
    yearn = await Yearn.deploy(dummyToken, dummyVault);
    await yearn.waitForDeployment();

    const Compound = await ethers.getContractFactory("MockCompoundStrategy");
    compound = await Compound.deploy(dummyToken, dummyVault);
    await compound.waitForDeployment();

    await token.mint(user.getAddress(), ethers.parseEther("1000"));

    await token.connect(user).approve(await aave.getAddress(), ethers.parseEther("1000"));
    await token.connect(user).approve(await yearn.getAddress(), ethers.parseEther("1000"));
    await token.connect(user).approve(await compound.getAddress(), ethers.parseEther("1000"));
  });

  it("should deposit and increase totalAssets", async function () {

    await aave.deposit(ethers.parseEther("100"));
    await yearn.deposit(ethers.parseEther("200"));
    await compound.deposit(ethers.parseEther("300"));

    const balAave = await aave.balance();
    const balYearn = await yearn.balance();
    const balCompound = await compound.balance();

    expect(balAave).to.be.gte(ethers.parseEther("100"));
    expect(balYearn).to.be.gte(ethers.parseEther("200"));
    expect(balCompound).to.be.gte(ethers.parseEther("300"));
  });

  it("should simulate yield over blocks", async function () {
    await aave.deposit(ethers.parseEther("100"));
    const bal1 = await aave.balance();

    await network.provider.send("evm_mine");
    await network.provider.send("evm_mine");

    await aave.simulateYield();
    const bal2 = await aave.balance();

    expect(bal2).to.be.gt(bal1);
  });

  it("should withdraw correctly", async function () {
    await yearn.deposit(ethers.parseEther("150"));
    const balBefore = await yearn.balance();

    await yearn.withdraw(ethers.parseEther("50"));
    const balAfter = await yearn.balance();

    expect(balAfter).to.be.lt(balBefore);
  });
});