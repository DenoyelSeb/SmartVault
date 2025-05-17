import { useState, useEffect } from "react";
import { ethers } from "ethers";
import deployed from "./deployed.json";
import vaultJson from "./abi/NeoVaultAggregator.json";
import oracleJson from "./abi/OracleMock.json";
import erc20Json from "./abi/ERC20Mock.json";

const HOLESKY_CHAIN_ID = "0x4268";

const vaultAbi = vaultJson.abi;
const oracleAbi = oracleJson.abi;
const erc20Abi = erc20Json.abi;

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
    if (!window.ethereum) {
      alert("MetaMask non détecté");
      return;
    }

    // 1. Request account access
    const prov = new ethers.BrowserProvider(window.ethereum);
    await prov.send("eth_requestAccounts", []);

    // 2. Ensure we're on Holesky (chainId 17000)
    const { chainId } = await prov.getNetwork();
    if (chainId !== 17000) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HOLESKY_CHAIN_ID }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: HOLESKY_CHAIN_ID,
              chainName: "Holesky Testnet",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://ethereum-holesky.publicnode.com"],
              blockExplorerUrls: ["https://holesky.beaconcha.in"],
            }],
          });
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: HOLESKY_CHAIN_ID }],
          });
        } else {
          alert("Impossible de passer sur Holesky: " + switchError.message);
          return;
        }
      }
    }

    // 3. Recreate provider/signers after network switch
    const provider2 = new ethers.BrowserProvider(window.ethereum);
    const signer2 = await provider2.getSigner();
    const account2 = await signer2.getAddress();
    setProvider(provider2);
    setSigner(signer2);
    setAccount(account2);

    // 4. Initialize contracts with the correct signer
    setVault(new ethers.Contract(deployed.NeoVaultAggregator, vaultAbi, signer2));
    setOracle(new ethers.Contract(deployed.OracleMock, oracleAbi, signer2));
    setToken(new ethers.Contract(deployed.UnderlyingToken, erc20Abi, signer2));
  };

  const fetchData = async () => {
  if (!vault || !oracle || !account) return;

  try {
    const rawShares = await vault.shares(account);
    const rawTVL = await vault.vaultBalance();

    setShares(ethers.formatEther(rawShares));
    setVaultBalance(ethers.formatEther(rawTVL));
  } catch (err) {
    console.error("Erreur en lisant vaultBalance ou shares :", err);
    setVaultBalance("Erreur");
    setShares("Erreur");
  }

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
    
    const vaultAddress = await vault.getAddress();

    if (!depositAmount || isNaN(depositAmount)) {
      alert("⛔ Veuillez entrer un montant valide avant de déposer");
    return;
    }
    const amount = ethers.parseEther(depositAmount);
    const allowance = await token.allowance(account, vaultAddress);

    if (allowance < amount) {
      const tx1 = await token.approve(vaultAddress, amount);
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
  
  const mint = async () => {
  const tx = await token.mint(account, ethers.parseEther("100"));
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
          <button onClick={deposit} disabled={!vault || !account}>Deposit</button>
          <button onClick={withdraw} disabled={!vault || !account}>Withdraw</button>
          <button onClick={rebalance} disabled={!vault || !account}>Rebalance</button>
          <button onClick={mint} disabled={!vault || !account}>Mint 100 tokens</button>
        </>
      )}
    </div>
  );
}

export default App;
