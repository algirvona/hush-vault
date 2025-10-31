"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useFhevm } from "../fhevm/useFhevm";
import { useWagmiEthersSigner } from "../hooks/useWagmiEthersSigner";

interface FhevmContextType {
  instance: any;
  status: "idle" | "loading" | "ready" | "error";
  error: Error | undefined;
  refresh: () => void;
  provider: any;
  chainId: number | undefined;
  isConnected: boolean;
  ethersSigner: any;
  ethersReadonlyProvider: any;
}

const FhevmContext = createContext<FhevmContextType | undefined>(undefined);

interface FhevmProviderProps {
  children: ReactNode;
}

export const FhevmProvider: React.FC<FhevmProviderProps> = ({ children }) => {
  const {
    provider,
    chainId,
    isConnected,
    ethersSigner,
    ethersReadonlyProvider,
  } = useWagmiEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
    refresh: fhevmRefresh,
  } = useFhevm({
    provider,
    chainId,
    enabled: isConnected,
  });

  const contextValue: FhevmContextType = {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
    refresh: fhevmRefresh,
    provider,
    chainId,
    isConnected,
    ethersSigner,
    ethersReadonlyProvider,
  };

  return (
    <FhevmContext.Provider value={contextValue}>
      {children}
    </FhevmContext.Provider>
  );
};

export const useFhevmContext = (): FhevmContextType => {
  const context = useContext(FhevmContext);
  if (!context) {
    throw new Error("useFhevmContext must be used within a FhevmProvider");
  }
  return context;
};
