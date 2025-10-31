# HushVault - Private Group Savings

Frontend application for HushVault, a confidential group savings platform built with Zama's FHEVM.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MetaMask with Sepolia testnet

### Development

```bash
# Install dependencies
npm install

# Generate ABIs from deployed contracts
npm run genabi

# Start dev server
npm run dev
```

Visit `http://localhost:5173`

### Production

```bash
npm run build
npm run preview
```

## 🏗️ Tech Stack

- **Framework**: React + TypeScript + Vite
- **Web3**: Wagmi + Ethers.js v6
- **Encryption**: Zama FHEVM Relayer SDK
- **Styling**: Tailwind CSS
- **Network**: Sepolia Testnet

## 📁 Structure

```
site/
├── app/              # App layout & pages
├── components/       # React components
│   ├── HushSave.tsx  # Main pool UI
│   ├── Create.tsx    # Pool creation
│   └── WalletButton.tsx
├── hooks/            # Custom hooks
│   ├── useHushSave.tsx   # Pool operations
│   └── useFhevm.tsx      # FHEVM instance
├── abi/              # Contract ABIs (auto-generated)
└── fhevm/            # FHEVM SDK integration
```

## 🔧 Components

### Core Components
- **HushSave.tsx**: Pool management (deposit, withdraw, view balance)
- **Create.tsx**: Create new savings pools
- **TabNavigation.tsx**: Navigation between tabs
- **WalletButton.tsx**: Wallet connection
- **FaucetButton.tsx**: Get test USDT

### Custom Hooks
- **useHushSave**: Pool operations (create, deposit, withdraw, decrypt)
- **useFhevm**: FHEVM instance management and encryption

## 🎯 Usage

### Connect Wallet
1. Click "Connect Wallet"
2. Approve MetaMask connection
3. Switch to Sepolia network if needed

### Create Pool
1. "Create" tab → Enter details
2. Add members (comma-separated addresses)
3. Confirm transaction

### Deposit
1. Select pool → "Deposit" tab
2. Enter amount → Approve & Deposit
3. Balance encrypted automatically

### Withdraw
1. "Withdraw" tab → Request amount
2. Oracle auto-completes (2-step process)
3. Receive tokens (fee applied if early)

### Decrypt Balance
1. "Overview" tab → "Decrypt Balance"
2. Approve in MetaMask
3. View your private balance

## 🐛 Troubleshooting

**"Network error"**
- Check MetaMask is on Sepolia
- Verify RPC URL in config

**"Contract not found"**
- Run `npm run genabi` to regenerate ABIs
- Check contract addresses in `abi/HushSaveAddresses.ts`

**"Transaction failed"**
- Ensure you're a pool member
- Check pool is active/withdrawable
- Verify token approval

**"Nonce mismatch"**
- MetaMask → Settings → Advanced → Clear Activity Tab

## 📚 Resources

- [Zama FHEVM Docs](https://docs.zama.ai/protocol/)
- [Wagmi Documentation](https://wagmi.sh)
- [Vite Documentation](https://vitejs.dev)

---

**HushVault** 🤫 - Built with Zama's FHEVM
