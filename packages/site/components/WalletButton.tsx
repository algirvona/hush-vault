"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useEffect } from 'react';

export const WalletButton = () => {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // Auto switch to Sepolia after connecting
  useEffect(() => {
    if (isConnected && chainId && chainId !== sepolia.id && switchChain) {
      try {
        switchChain({ chainId: sepolia.id });
      } catch (error) {
        console.warn('Failed to auto switch to Sepolia:', error);
      }
    }
  }, [isConnected, chainId, switchChain]);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        // Nếu đã kết nối, dùng mặc định RainbowKit
        if (connected) {
          return <ConnectButton />;
        }

        // Nếu chưa kết nối, dùng custom button giống Faucet
        return (
          <button
            onClick={openConnectModal}
            type="button"
            className="btn-primary text-white font-bold h-10 px-4 min-w-[120px] text-sm"
          >
            Connect Wallet
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
};
