# HushVault 🤫

**Private Group Savings** built with Zama's FHEVM - Save together while keeping your contributions confidential.

> Only you know how much you've saved. Fully encrypted balances using Fully Homomorphic Encryption.

## 🎯 Features

- **🔒 Confidential Deposits**: Each contribution encrypted with FHE
- **👥 Group Savings Pools**: Create pools with target amount and duration
- **🔐 Private Balances**: Only you can decrypt your balance
- **💸 Flexible Withdrawals**: Regular (no fee) or early (10% fee)
- **🛡️ Creator Controls**: Close pools early for penalty-free withdrawals

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MetaMask
- Sepolia testnet ETH

### Setup

```bash
# Install
cd active/zama-app-04
node ./scripts/install.mjs

# Configure
cd packages/fhevm-hardhat-template
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Deploy
npx hardhat deploy --network sepolia

# Generate ABIs & Run
cd ../site
npm run genabi
npm run dev
```

Visit `http://localhost:5173`

## 📖 Usage

### Create Pool
1. Connect wallet → "Create" tab
2. Enter name, target amount (USDT), duration (days)
3. Add members (comma-separated addresses)

### Deposit
1. Select pool → "Deposit" tab
2. Enter amount → Approve & Deposit
3. Your balance is encrypted on-chain

### Withdraw (2-Step Process)
1. **Request**: "Withdraw" tab → Enter amount → Request
2. **Complete**: Oracle auto-decrypts and sends tokens
   - No fee if: Goal reached OR Time up OR Pool closed early
   - 10% fee otherwise

### View Balance
1. Pool → "Overview" tab
2. Click "Decrypt Balance" (only you can see it)

## ⚙️ How It Works

### Encrypted Deposits
```solidity
// Your deposit amount stays encrypted
euint128 encryptedAmount = FHE.fromExternal(inputEuint, proof);
balances[user] = FHE.add(balances[user], encryptedAmount);
```

### Private Withdrawals
```solidity
// Step 1: Request (balance checked on encrypted data)
FHE.requestDecryption(encryptedAmount, callback);

// Step 2: Oracle decrypts & completes automatically
FHE.checkSignatures(requestId, cleartexts, proof);
token.transfer(user, amount);
```

### Privacy Guarantees
- ✅ **Private**: Individual balances, deposit amounts, withdrawal requests
- 🔓 **Public**: Pool params, member list, aggregate total

## 🏗️ Architecture

### Smart Contracts
- **HushSave.sol**: Main pool contract (FHEVM 0.8.0)
- **PublicToken.sol**: Mock USDT for testing

### Frontend
- React + TypeScript + Vite
- Wagmi + Ethers.js v6
- Zama FHEVM Relayer SDK
- Tailwind CSS

## 🔐 Security

- **FHE Encryption**: All balances encrypted end-to-end
- **Oracle Signatures**: Verified decryption prevents tampering
- **Access Control**: Creator/member permissions enforced
- **Fee Mechanism**: 10% penalty discourages early withdrawal

## 📊 Status

✅ **Live**: Create pools, encrypted deposits, 2-step withdrawals, fee tracking  
⚠️ **Testnet**: Sepolia only (requires active FHEVM oracle)

## 🐛 Limitations

- Oracle-dependent withdrawals (may take time)
- Higher gas costs (FHE operations)
- Testnet only

## 📚 Resources

- [Zama FHEVM Docs](https://docs.zama.ai/protocol/solidity-guides/)
- [FHEVM Oracle Guide](https://docs.zama.ai/protocol/solidity-guides/smart-contract/decryption)
- [Zama Discord](https://discord.gg/zama)

## 📄 License

MIT License

---

<div align="center">

**HushVault** 🤫 - *Save together. Keep it private.*

Built with [Zama's FHEVM](https://www.zama.ai/fhevm)

</div>
