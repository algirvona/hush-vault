"use client";

import { useState } from "react";
import { useFhevmContext } from "../contexts/FhevmContext";
import { useHushSave } from "../hooks/useHushSave";
import { useTab } from "@/contexts/TabContext";

export const Create = () => {
  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
    chainId,
    isConnected,
    ethersSigner,
    ethersReadonlyProvider,
  } = useFhevmContext();

  const {
    error,
    createPoolStatus,
    createPool,
    getMyPools,
  } = useHushSave({
    fhevmInstance,
    ethersSigner,
    ethersReadonlyProvider,
    chainId,
  });

  const { setActiveTab } = useTab();

  // Form states
  const [poolName, setPoolName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [durationDays, setDurationDays] = useState("");

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold mb-4 text-white">Please connect your wallet</h2>
        <p className="text-white">Use the wallet button above</p>
      </div>
    );
  }

  if (fhevmStatus === "error") {
    return <p className="text-red-600">FHEVM Error: {fhevmError?.message || "Unknown error"}</p>;
  }

  return (
    <div className="flex flex-col p-8 max-w-[480px] mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6 text-white">Create New Pool</h1>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm mb-4 w-full">
          Error: {error}
        </div>
      )}

      {/* Create Pool Form */}
      <div className="w-full border border-custom rounded-xl p-6 bg-primary">
        <h2 className="text-lg font-semibold mb-4 text-white">Pool Configuration</h2>
          
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Pool Name:</label>
            <input
              type="text"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              placeholder="e.g., Summer Vacation Fund"
              className="p-2 border border-custom rounded w-full bg-secondary text-white placeholder-gray-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Target Amount (USDT):</label>
            <input
              type="text"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="e.g., 1000"
              className="p-2 border border-custom rounded w-full bg-secondary text-white placeholder-gray-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Duration (Days):</label>
            <input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="e.g., 30"
              className="p-2 border border-custom rounded w-full bg-secondary text-white placeholder-gray-400"
            />
          </div>

          <button
            onClick={async () => {
              if (!poolName || !targetAmount || !durationDays) {
                alert("Please fill in all fields");
                return;
              }
              
              const result = await createPool(poolName, targetAmount, parseInt(durationDays));
              
              if (result && result.poolId !== null) {
                setPoolName("");
                setTargetAmount("");
                setDurationDays("");
                
                alert(`Pool #${result.poolId} created successfully! Redirecting to HushSave...`);
                
                // Refresh my pools
                setTimeout(() => {
                  getMyPools();
                }, 1000);
                
                // Switch to HushSave tab
                setActiveTab("hushsave");
              }
            }}
            disabled={createPoolStatus === "loading"}
            className="btn-primary text-white font-bold py-2 px-4 w-full disabled:opacity-50 text-sm"
          >
            {createPoolStatus === "loading" ? "Creating..." : "Create Pool"}
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 w-full bg-primary border border-custom rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-2">About Pools</h3>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>Create a savings pool with your friends or colleagues</li>
          <li>Set a target amount and duration for your goal</li>
          <li>Add members who can contribute to the pool</li>
          <li>Withdraw funds after duration ends or request early withdrawal (with fee)</li>
        </ul>
      </div>
    </div>
  );
};

