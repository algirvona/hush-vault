"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useEffect, useState, useRef } from 'react';

export const WalletButton = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  if (isConnected) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="btn-primary text-white font-bold h-10 px-4 min-w-[120px] text-sm"
        >
          <div className="font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </button>
        
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-secondary rounded-lg shadow-lg border border-custom z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white">Wallet Address</span>
                <button
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex items-center gap-2 mb-3 p-2 bg-tertiary rounded">
                <span className="font-mono text-sm flex-1 text-white">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  onClick={copyAddress}
                  className="text-white hover:text-gray-400 p-1"
                  title="Copy address"
                >
                  📋
                </button>
              </div>
              
              <button
                onClick={() => {
                  disconnect();
                  setIsDropdownOpen(false);
                }}
                className="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => {
          // Chỉ dùng connector đầu tiên (injected)
          if (connectors[0]) {
            connect({ connector: connectors[0] });
          }
        }}
        disabled={isPending}
        className="btn-primary disabled:bg-gray-400 text-white font-bold h-10 px-4 min-w-[120px] text-sm"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
};
