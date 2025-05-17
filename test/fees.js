const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FeesManager", function () {
  let feesManager, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();

    const FeesManager = await ethers.getContractFactory("FeesManager");
    feesManager = await FeesManager.deploy(1000); // 10%
    await feesManager.waitForDeployment();
  });

  it("should calculate correct fee", async function () {
    const profit = ethers.parseEther("100");
    const fee = await feesManager.collectFee.staticCall(profit); // ✅
    expect(fee).to.equal(ethers.parseEther("10"));
  });

  it("should return zero if no profit", async function () {
    const fee = await feesManager.collectFee.staticCall(0); // ✅
    expect(fee).to.equal(ethers.parseEther("0"));
  });

  it("should update fee only by owner", async function () {
    await feesManager.setPerformanceFee(2000);
    const profit = ethers.parseEther("100");
    const fee = await feesManager.collectFee.staticCall(profit); // ✅
    expect(fee).to.equal(ethers.parseEther("20"));
  });

  it("should revert if non-owner tries to update fee", async function () {
    await expect(
      feesManager.connect(other).setPerformanceFee(3000)
    ).to.be.revertedWith("Not owner");
  });

  it("should revert if fee too high", async function () {
    await expect(feesManager.setPerformanceFee(6000)).to.be.revertedWith("Too high");
  });
});
