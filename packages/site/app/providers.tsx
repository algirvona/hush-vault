"use client";

import type { ReactNode } from "react";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '@/config/wagmi';
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import { FhevmProvider } from "@/contexts/FhevmContext";
import { TabProvider } from "@/contexts/TabContext";
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en">
          <InMemoryStorageProvider>
            <FhevmProvider>
              <TabProvider>
                {children}
              </TabProvider>
            </FhevmProvider>
          </InMemoryStorageProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
