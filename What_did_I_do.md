## ✅ MetaMask & Wallet Integration Features Implemented

### 1. **MetaMask Wallet Connection**
- Users can connect their MetaMask wallet via a button in the Navbar.
- If MetaMask is not installed, users are prompted to install it.

### 2. **Wallet Address & Network Display**
- Once connected, the wallet address is shown in the Navbar (shortened for readability).
- The current Ethereum network name is displayed.
- Clicking the address copies it to the clipboard with a “Copied!” feedback.

### 3. **Account & Network Management**
- The UI automatically updates if the user switches accounts or networks in MetaMask.

### 4. **ETH Balance Display**
- The connected wallet’s ETH balance is shown in the Navbar and updates automatically.

### 5. **Disconnect Wallet**
- Users can disconnect their wallet, which clears wallet info from the UI.

### 6. **Send ETH & ERC-20 Tokens (USDT)**
- A “Send ETH” button in the Navbar opens a modal.
- Users can send ETH or USDT (Goerli testnet) to any address.
- The modal includes:
  - Token selection dropdown (ETH, USDT; easily extensible for more tokens)
  - Recipient address and amount fields
  - Gas price (Gwei) and gas limit customization
  - For ERC-20 tokens, the user’s token balance is displayed
  - Transaction status and error messages

### 7. **Transaction History**
- The modal displays the last 5 transactions for the connected wallet (using Etherscan API).

### 8. **Code Quality**
- All React Hook and linter warnings have been resolved.
- The code is modular and ready for future extensibility (e.g., more tokens, more features).
