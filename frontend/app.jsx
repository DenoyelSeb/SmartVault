import { useState, useEffect } from "react";
import { ethers } from "ethers";
import deployed from "./deployed.json";
import vaultAbi from "./abi/NeoVaultAggregator.json";
import oracleAbi from "./abi/OracleMock.json";
import erc20Abi from "./abi/ERC20Mock.json";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [vault, setVault] = useState(null);
  const [oracle, setOracle] = useState(null);
  const [token, setToken] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [shares, setShares] = useState("0");
  const [vaultBalance, setVaultBalance] = useState("0");
  const [apyData, setApyData] = useState([]);

  const strategies = [
    deployed.MockAaveStrategy,
    deployed.MockYearnStrategy,
    deployed.MockCompoundStrategy,
  ];

  const connect = async () => {
    const prov = new ethers.BrowserProvider(window.ethereum);
    const accounts = await prov.send("eth_requestAccounts", []);
    const signer = await prov.getSigner();
    setProvider(prov);
    setSigner(signer);
    setAccount(accounts[0]);

    const vault = new ethers.Contract(deployed.NeoVaultAggregator, vaultAbi, signer);
    const oracle = new ethers.Contract(deployed.OracleMock, oracleAbi, signer);
    const token = new ethers.Contract(deployed.UnderlyingToken, erc20Abi, signer);

    setVault(vault);
    setOracle(oracle);
    setToken(token);
  };

  const fetchData = async () => {
    if (!vault || !oracle || !account) return;

    const rawShares = await vault.shares(account);
    const rawTVL = await vault.vaultBalance();

    setShares(ethers.formatEther(rawShares));
    setVaultBalance(ethers.formatEther(rawTVL));

    const apys = await Promise.all(
      strategies.map(async (s) => {
        try {
          const apy = await oracle.getAPY(s);
          return { strategy: s.slice(0, 10) + "...", apy: Number(apy) / 100 + "%" };
        } catch {
          return { strategy: s.slice(0, 10) + "...", apy: "?" };
        }
      })
    );

    setApyData(apys);
  };

  const deposit = async () => {
    const amount = ethers.parseEther(depositAmount);
    const allowance = await token.allowance(account, vault.target);

    if (allowance < amount) {
      const tx1 = await token.approve(vault.target, amount);
      await tx1.wait();
    }

    const tx2 = await vault.deposit(amount);
    await tx2.wait();
    await fetchData();
  };

  const withdraw = async () => {
    const userShares = await vault.shares(account);
    const tx = await vault.withdraw(userShares);
    await tx.wait();
    await fetchData();
  };

  const rebalance = async () => {
    const tx = await vault.rebalance();
    await tx.wait();
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [vault, oracle, account]);

  return (
    <div className="container">
      <h1>🚀 Yield Aggregator</h1>
      {!account ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <>
          <p>👤 Address: {account.slice(0, 6)}...{account.slice(-4)}</p>
          <p>🏦 TVL: {vaultBalance} tokens</p>
          <p>🎟️ Your shares: {shares}</p>

          <h2>📊 APYs</h2>
          <ul>
            {apyData.map((s, i) => (
              <li key={i}>
                {s.strategy}: {s.apy}
              </li>
            ))}
          </ul>

          <input
            type="text"
            placeholder="Amount to deposit"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button onClick={deposit}>Deposit</button>
          <button onClick={withdraw}>Withdraw</button>
          <button onClick={rebalance}>Rebalance</button>
        </>
      )}
    </div>
  );
}

export default App;
