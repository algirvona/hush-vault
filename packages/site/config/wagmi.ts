import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import {
  injectedWallet,
  metaMaskWallet,
} from '@rainbow-me/rainbowkit/wallets';

// Only use popular EVM wallets (MetaMask, OKX, etc) - exclude Coinbase Wallet
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        injectedWallet,
        metaMaskWallet,
      ],
    },
  ],
  {
    appName: 'HushVault - Private Group Savings',
    projectId: '00000000000000000000000000000000', // Dummy projectId - not using WalletConnect
  }
);

export const config = createConfig({
  chains: [sepolia],
  connectors,
  transports: {
    [sepolia.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
