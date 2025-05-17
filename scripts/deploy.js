const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with: ${await deployer.getAddress()}`);

  const deployed = {};

  // Deploy mock ERC20 as underlying asset 
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Mock.deploy("Mock DAI", "mDAI", 18);
  await token.waitForDeployment();
  deployed.UnderlyingToken = await token.getAddress();

  // Deploy FeesManager (10% fee)
  const FeesManager = await hre.ethers.getContractFactory("FeesManager");
  const feesManager = await FeesManager.deploy(1000); // 10% fee
  await feesManager.waitForDeployment();
  deployed.FeesManager = await feesManager.getAddress();

  // Temporary placeholder for vault address to use in strategy deployment
  const VaultPlaceholder = await hre.ethers.getContractFactory("NeoVaultAggregator");
  const dummyVault = hre.ethers.ZeroAddress;

  // Deploy strategies with (underlying, vault)
  const Aave = await hre.ethers.getContractFactory("MockAaveStrategy");
  const aave = await Aave.deploy(await token.getAddress(), dummyVault);
  await aave.waitForDeployment();
  deployed.MockAaveStrategy = await aave.getAddress();

  const Yearn = await hre.ethers.getContractFactory("MockYearnStrategy");
  const yearn = await Yearn.deploy(await token.getAddress(), dummyVault);
  await yearn.waitForDeployment();
  deployed.MockYearnStrategy = await yearn.getAddress();

  const Compound = await hre.ethers.getContractFactory("MockCompoundStrategy");
  const compound = await Compound.deploy(await token.getAddress(), dummyVault);
  await compound.waitForDeployment();
  deployed.MockCompoundStrategy = await compound.getAddress();

  // Deploy OracleMock with strategies
  const Oracle = await hre.ethers.getContractFactory("OracleMock");
  const oracle = await Oracle.deploy([
    await aave.getAddress(),
    await yearn.getAddress(),
    await compound.getAddress(),
  ]);
  await oracle.waitForDeployment();
  deployed.OracleMock = await oracle.getAddress();

  // Deploy NeoVaultAggregator
  const Vault = await hre.ethers.getContractFactory("NeoVaultAggregator");
  const vault = await Vault.deploy(
    [await aave.getAddress(), await yearn.getAddress(), await compound.getAddress()],
    await oracle.getAddress(),
    await feesManager.getAddress(),
    await token.getAddress()
  );
  await vault.waitForDeployment();
  deployed.NeoVaultAggregator = await vault.getAddress();

  // Set fee recipient to deployer
  await vault.setFeeRecipient(await deployer.getAddress());

  // Save deployed addresses
  fs.writeFileSync("./frontend/src/deployed.json", JSON.stringify(deployed, null, 2));
  console.log("✅ Contracts deployed and saved to deployed.json");

  console.log("📦 Deployed addresses:");
  console.table(deployed);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
