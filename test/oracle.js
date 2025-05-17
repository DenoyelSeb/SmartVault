const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OracleMock", function () {
  let oracle, aave, yearn, compound;

  beforeEach(async function () {
    const dummyToken = ethers.ZeroAddress;
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

    const Oracle = await ethers.getContractFactory("OracleMock");
    oracle = await Oracle.deploy([aave.getAddress(), yearn.getAddress(), compound.getAddress()]);
    await oracle.waitForDeployment();
  });

  it("should return valid APY for each strategy", async function () {
    const apyAave = await oracle.getAPY(aave.getAddress());
    const apyYearn = await oracle.getAPY(yearn.getAddress());
    const apyCompound = await oracle.getAPY(compound.getAddress());

    expect(apyAave).to.be.gt(0);
    expect(apyYearn).to.be.gt(0);
    expect(apyCompound).to.be.gt(0);
  });

  it("should reject unknown strategy", async function () {
    const Random = await ethers.getContractFactory("MockAaveStrategy");
    const random = await Random.deploy(ethers.ZeroAddress, ethers.ZeroAddress);
    await random.waitForDeployment();

    await expect(oracle.getAPY(random.getAddress())).to.be.revertedWith("Unknown strategy");
  });
});