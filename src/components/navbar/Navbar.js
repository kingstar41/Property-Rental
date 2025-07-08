import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { Contract } from "ethers";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import logo from "../../images/logo/logo.png";
import { Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./navbar.css";

// Token options for dropdown (module scope)
const tokenOptions = [
  {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    type: "native"
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    type: "erc20",
    address: "0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02" // Goerli USDT
  }
];

// ERC-20 ABI (minimal, module scope)
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

function NavBar() {
  const [walletAddress, setWalletAddress] = useState("");
  const [network, setNetwork] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [txTo, setTxTo] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [txError, setTxError] = useState("");
  const [txHistory, setTxHistory] = useState([]);
  const [gasPrice, setGasPrice] = useState("");
  const [gasLimit, setGasLimit] = useState("");
  const ETHERSCAN_API_KEY = "YourEtherscanAPIKey"; // Replace with your Etherscan API key

  // Token options for dropdown
  const [selectedToken, setSelectedToken] = useState(tokenOptions[0].symbol);
  const [erc20Balance, setErc20Balance] = useState("");

  // Connect to MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      setIsConnecting(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWalletAddress(accounts[0]);
        const net = await provider.getNetwork();
        setNetwork(net.name);
      } catch (err) {
        console.error(err);
      }
      setIsConnecting(false);
    } else {
      window.open("https://metamask.io/download.html", "_blank");
    }
  };

  // Listen for account/network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        setWalletAddress(accounts[0] || "");
      };
      const handleChainChanged = async () => {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const net = await provider.getNetwork();
        setNetwork(net.name);
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  // Fetch ETH balance
  const fetchBalance = async (address) => {
    if (window.ethereum && address) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(address);
      setBalance(ethers.formatEther(bal));
    } else {
      setBalance("");
    }
  };

  // Update balance when walletAddress or network changes
  useEffect(() => {
    if (walletAddress) {
      fetchBalance(walletAddress);
    } else {
      setBalance("");
    }
  }, [walletAddress, network]);

  // Fetch transaction history
  const fetchTxHistory = async (address) => {
    if (!address) return;
    try {
      const res = await fetch(
        `https://api-goerli.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${ETHERSCAN_API_KEY}`
      );
      const data = await res.json();
      if (data.status === "1") {
        setTxHistory(data.result.slice(0, 5)); // Show last 5 txs
      } else {
        setTxHistory([]);
      }
    } catch (err) {
      setTxHistory([]);
    }
  };

  useEffect(() => {
    if (walletAddress && showModal) {
      fetchTxHistory(walletAddress);
    }
  }, [walletAddress, showModal]);

  // Fetch ERC-20 balance
  const fetchErc20Balance = useCallback(async (address, token) => {
    if (!address || token.type !== "erc20") {
      setErc20Balance("");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new Contract(token.address, ERC20_ABI, provider);
      const bal = await contract.balanceOf(address);
      setErc20Balance((Number(bal) / 10 ** token.decimals).toFixed(4));
    } catch {
      setErc20Balance("");
    }
  }, []);

  useEffect(() => {
    if (walletAddress && showModal && selectedToken !== "ETH") {
      const token = tokenOptions.find(t => t.symbol === selectedToken);
      fetchErc20Balance(walletAddress, token);
    }
  }, [walletAddress, showModal, selectedToken, fetchErc20Balance]);

  // Disconnect wallet (clear state)
  const disconnectWallet = () => {
    setWalletAddress("");
    setNetwork("");
    setBalance("");
  };

  // Copy address to clipboard
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }
  };

  // Handle send for ETH or ERC-20
  const handleSendTransaction = async (e) => {
    e.preventDefault();
    setTxStatus("");
    setTxError("");
    const token = tokenOptions.find(t => t.symbol === selectedToken);
    if (!ethers.isAddress(txTo)) {
      setTxError("Invalid recipient address");
      return;
    }
    if (!txAmount || isNaN(txAmount) || Number(txAmount) <= 0) {
      setTxError("Invalid amount");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      if (token.type === "native") {
        const txParams = {
          to: txTo,
          value: ethers.parseUnits(txAmount, token.decimals)
        };
        if (gasPrice) {
          txParams.gasPrice = ethers.parseUnits(gasPrice, "gwei");
        }
        if (gasLimit) {
          txParams.gasLimit = parseInt(gasLimit, 10);
        }
        const tx = await signer.sendTransaction(txParams);
        setTxStatus("Transaction sent! Waiting for confirmation...");
        await tx.wait();
        setTxStatus("Transaction confirmed! Hash: " + tx.hash);
        setTxTo("");
        setTxAmount("");
        setGasPrice("");
        setGasLimit("");
        fetchBalance(walletAddress); // update balance
      } else if (token.type === "erc20") {
        const contract = new Contract(token.address, ERC20_ABI, signer);
        const amount = ethers.parseUnits(txAmount, token.decimals);
        let overrides = {};
        if (gasPrice) {
          overrides.gasPrice = ethers.parseUnits(gasPrice, "gwei");
        }
        if (gasLimit) {
          overrides.gasLimit = parseInt(gasLimit, 10);
        }
        const tx = await contract.transfer(txTo, amount, overrides);
        setTxStatus("Transaction sent! Waiting for confirmation...");
        await tx.wait();
        setTxStatus("Transaction confirmed! Hash: " + tx.hash);
        setTxTo("");
        setTxAmount("");
        setGasPrice("");
        setGasLimit("");
        fetchErc20Balance(walletAddress, token);
      }
    } catch (err) {
      setTxError(err.message || "Transaction failed");
    }
  };

  return (
    <Navbar expand="lg" className="py-3">
      <Container>
        <Navbar.Brand href="#" className="me-lg-5">
          <img className="logo" src={logo} alt="logo" />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="navbarScroll" />
        <Navbar.Collapse id="navbarScroll">
          <Nav className="me-auto my-2 my-lg-0" navbarScroll>
            <Nav.Link href="#action1">Marketplace</Nav.Link>
            <Nav.Link href="#action2" className="px-lg-3">
              About Us
            </Nav.Link>
            <Nav.Link href="#action3">Developers</Nav.Link>
          </Nav>
        </Navbar.Collapse>
        <div className="d-flex align-items-center order">
          <span className="line d-lg-inline-block d-none"></span>
          <i className="fa-regular fa-heart"></i>
          {walletAddress ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  background: "#f5f5f5",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 13,
                  fontFamily: "monospace",
                  cursor: "pointer"
                }}
                title="Copy address"
                onClick={copyAddress}
              >
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                {copied && <span style={{ marginLeft: 4, color: "green" }}>Copied!</span>}
              </span>
              <span style={{ fontSize: 12, color: "#888" }}>{network && `(${network})`}</span>
              {balance && (
                <span style={{ fontSize: 12, color: "#333", background: "#e6f7ff", borderRadius: 6, padding: "2px 6px" }}>
                  {parseFloat(balance).toFixed(4)} ETH
                </span>
              )}
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={disconnectWallet}
                style={{ marginLeft: 4 }}
              >
                Disconnect
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => setShowModal(true)}
                style={{ marginLeft: 4 }}
              >
                Send ETH
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              className="btn-primary d-none d-lg-inline-block"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </Container>
      {/* Send Transaction Modal */}
      <Modal show={showModal} onHide={() => { setShowModal(false); setTxStatus(""); setTxError(""); }}>
        <Modal.Header closeButton>
          <Modal.Title>Send ETH</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSendTransaction}>
            <Form.Group className="mb-3" controlId="formTokenSelect">
              <Form.Label>Token</Form.Label>
              <Form.Select
                value={selectedToken}
                onChange={e => setSelectedToken(e.target.value)}
              >
                {tokenOptions.map(token => (
                  <option key={token.symbol} value={token.symbol}>{token.name} ({token.symbol})</option>
                ))}
              </Form.Select>
            </Form.Group>
            {selectedToken === "ETH" ? null : (
              <div style={{ marginBottom: 8, fontSize: 13 }}>
                Balance: {erc20Balance !== "" ? `${erc20Balance} ${selectedToken}` : "-"}
              </div>
            )}
            <Form.Group className="mb-3" controlId="formToAddress">
              <Form.Label>Recipient Address</Form.Label>
              <Form.Control
                type="text"
                placeholder="0x..."
                value={txTo}
                onChange={e => setTxTo(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formAmount">
              <Form.Label>Amount ({selectedToken})</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="any"
                placeholder={`e.g. 0.01`}
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                required
              />
            </Form.Group>
            {txStatus && <div style={{ color: "green", marginBottom: 8 }}>{txStatus}</div>}
            {txError && <div style={{ color: "red", marginBottom: 8 }}>{txError}</div>}
            <Form.Group className="mb-3" controlId="formGasPrice">
              <Form.Label>Gas Price (Gwei)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="any"
                placeholder="Leave blank for default"
                value={gasPrice}
                onChange={e => setGasPrice(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formGasLimit">
              <Form.Label>Gas Limit</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="1"
                placeholder="Leave blank for default"
                value={gasLimit}
                onChange={e => setGasLimit(e.target.value)}
              />
            </Form.Group>
            <Button variant="primary" type="submit" disabled={!walletAddress}>
              Send
            </Button>
          </Form>
          <hr />
          <div>
            <h6>Recent Transactions</h6>
            {txHistory.length === 0 && <div style={{ fontSize: 13, color: '#888' }}>No recent transactions found.</div>}
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {txHistory.map(tx => (
                <li key={tx.hash} style={{ marginBottom: 6 }}>
                  <a href={`https://goerli.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                  </a> - {tx.value && (Number(tx.value) / 1e18).toFixed(4)} ETH
                  <span style={{ marginLeft: 8, color: tx.isError === "0" ? "green" : "red" }}>
                    {tx.isError === "0" ? "Success" : "Failed"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Modal.Body>
      </Modal>
    </Navbar>
  );
}

export default NavBar;
