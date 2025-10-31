"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useTab } from "@/contexts/TabContext";
import { useFhevmContext } from "../contexts/FhevmContext";
import { PublicTokenABI } from "@/abi/PublicTokenABI";
import { PublicTokenAddresses } from "@/abi/PublicTokenAddresses";

export const TabNavigation = () => {
  const { activeTab, setActiveTab } = useTab();
  
  return (
    <div className="flex gap-2">
      <button
        onClick={() => setActiveTab("hushsave")}
        className={`font-bold h-10 px-4 transition-colors min-w-[120px] text-sm ${
          activeTab === "hushsave"
            ? "btn-primary text-white"
            : "text-white btn-transparent"
        }`}
      >
        Dashboard
      </button>
      <button
        onClick={() => setActiveTab("create")}
        className={`font-bold h-10 px-4 transition-colors min-w-[120px] text-sm ${
          activeTab === "create"
            ? "btn-primary text-white"
            : "text-white btn-transparent"
        }`}
      >
        Create
      </button>
    </div>
  );
};

export const FaucetButton = () => {
  const [isMinting, setIsMinting] = useState(false);
  const { ethersSigner } = useFhevmContext();

  const handleMint = async () => {
    if (!ethersSigner || isMinting) return;
    
    try {
      setIsMinting(true);
      const usdtAddress = PublicTokenAddresses["11155111"]?.address;
      if (!usdtAddress) {
        alert('USDT contract not deployed');
        return;
      }

      const usdtContract = new ethers.Contract(usdtAddress, PublicTokenABI.abi, ethersSigner);
      const tx = await usdtContract.userMint();
      alert("Transaction submitted! Waiting for confirmation...");
      await tx.wait();
      alert("✅ Minted 1000 USDT successfully!");
    } catch (error: unknown) {
      console.error('Error minting USDT:', error);
      alert(`Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <button
      onClick={handleMint}
      disabled={isMinting}
      className="btn-primary text-white font-bold h-10 px-4 min-w-[100px] text-sm disabled:opacity-50"
    >
      {isMinting ? 'Minting...' : 'Faucet'}
    </button>
  );
};
