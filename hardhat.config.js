require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.28",
  networks: {
    holesky: {
      url: process.env.MY_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      chainId: 17000
    }
  }
};
