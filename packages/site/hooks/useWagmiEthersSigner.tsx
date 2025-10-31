"use client";

import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { useMemo } from 'react';

export interface UseWagmiEthersSignerState {
  provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error: Error | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  address: string | undefined;
}

export const useWagmiEthersSigner = (): UseWagmiEthersSignerState => {
  const { address, isConnected, chainId, status } = useAccount();
  const { data: walletClient } = useWalletClient();

  const ethersSigner = useMemo(() => {
    if (!walletClient || !isConnected) return undefined;
    
    try {
      const provider = new ethers.BrowserProvider(walletClient);
      return new ethers.JsonRpcSigner(provider, address!);
    } catch (err) {
      console.error('Error creating ethers signer:', err);
      return undefined;
    }
  }, [walletClient, isConnected, address]);

  const ethersReadonlyProvider = useMemo(() => {
    if (!walletClient || !isConnected) return undefined;
    
    try {
      return new ethers.BrowserProvider(walletClient);
    } catch (err) {
      console.error('Error creating readonly provider:', err);
      return undefined;
    }
  }, [walletClient, isConnected]);

  const provider = useMemo(() => {
    return walletClient as ethers.Eip1193Provider | undefined;
  }, [walletClient]);

  const accounts = useMemo(() => {
    return address ? [address] : undefined;
  }, [address]);

  return {
    provider,
    chainId,
    accounts,
    isConnected,
    error: undefined, // Wagmi v2 không có error trong useAccount
    ethersSigner,
    ethersReadonlyProvider,
    address,
  };
};
