"use client";

import { useState, useEffect, useCallback } from "react";
import { useFhevmContext } from "../contexts/FhevmContext";
import { useHushSave } from "../hooks/useHushSave";

interface PoolInfoType {
  poolId: number;
  name: string;
  targetAmount: string;
  totalDeposited: string;
  isActive: boolean;
  memberCount: bigint;
  creator: string;
}

export const HushSave = () => {
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [allPoolsInfo, setAllPoolsInfo] = useState<PoolInfoType[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState<"deposit" | "withdraw">("deposit");
  const [activeInfoTab, setActiveInfoTab] = useState<"overview" | "user">("overview");

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
    depositStatus,
    requestWithdrawStatus,
    addMembersStatus,
    closePoolStatus,
    addMembers,
    closePool,
    deposit,
    requestWithdraw,
    getPoolInfo,
    getPoolMembers,
    poolInfo,
    poolMembers,
    myPools,
    getMyPools,
    userAddress,
    getMyEncryptedBalance,
    decryptMyBalance,
    decryptedBalance,
    decryptStatus,
  } = useHushSave({
    fhevmInstance,
    ethersSigner,
    ethersReadonlyProvider,
    chainId,
  });

  // Form states
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [newMembers, setNewMembers] = useState("");

  // Load all pools info
  const loadAllPoolsInfo = useCallback(async () => {
    if (!ethersReadonlyProvider || myPools.length === 0) {
      setAllPoolsInfo([]);
      return;
    }
    
    setIsLoadingPools(true);
    try {
      // Import contract
      const { ethers } = await import("ethers");
      const { HushSaveABI } = await import("@/abi/HushSaveABI");
      const { HushSaveAddresses } = await import("@/abi/HushSaveAddresses");
      
      const contract = new ethers.Contract(
        HushSaveAddresses["11155111"].address,
        HushSaveABI.abi,
        ethersReadonlyProvider
      );
      
      // Load all pool infos in parallel
      const poolInfosPromises = myPools.map(async (poolId) => {
        try {
          const info = await contract.getPoolInfo(poolId);
          if (info[0]) {
            const poolData = {
              poolId,
              name: info[0],
              targetAmount: ethers.formatUnits(info[1], 6),
              totalDeposited: ethers.formatUnits(info[2], 6),
              isActive: info[5],
              memberCount: info[6],
              creator: info.length > 7 ? info[7] : ethers.ZeroAddress,
            };
            return poolData;
          }
          return null;
        } catch (err) {
          console.error(`Error loading pool ${poolId}:`, err);
          return null;
        }
      });
      
      const results = await Promise.all(poolInfosPromises);
      const validPools = results.filter(p => p !== null) as PoolInfoType[];
      
      // Sort pools: Active pools first (newest first by poolId), then Ended pools
      validPools.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1; // a active, b ended
        if (!a.isActive && b.isActive) return 1;  // a ended, b active
        // Both same status, sort by poolId descending (newer first)
        return b.poolId - a.poolId;
      });
      
      setAllPoolsInfo(validPools);
      
    } catch (err) {
      console.error("Error loading pools:", err);
    } finally {
      setIsLoadingPools(false);
    }
  }, [ethersReadonlyProvider, myPools]);

  // Load all pools when myPools changes
  useEffect(() => {
    if (isConnected && myPools.length > 0) {
      loadAllPoolsInfo();
    }
  }, [myPools, isConnected, loadAllPoolsInfo]);

  // Load selected pool details when pool ID changes
  useEffect(() => {
    if (selectedPoolId !== null && isConnected) {
      const loadPool = async () => {
        await getPoolInfo(selectedPoolId);
        setIsModalOpen(true);
      };
      loadPool();
    }
  }, [selectedPoolId, isConnected, getPoolInfo]);

  // Load pool members when pool info exists
  useEffect(() => {
    if (poolInfo && isConnected && selectedPoolId !== null) {
      getPoolMembers(selectedPoolId);
    }
  }, [poolInfo, selectedPoolId, isConnected, getPoolMembers]);

  // Auto-load encrypted balance when user is a member
  useEffect(() => {
    if (poolMembers.length > 0 && userAddress && poolMembers.includes(userAddress) && selectedPoolId !== null) {
      getMyEncryptedBalance(selectedPoolId);
    }
  }, [poolMembers, userAddress, selectedPoolId, getMyEncryptedBalance]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold mb-4">Please connect your wallet</h2>
        <p className="text-gray-600">Use the wallet button above</p>
      </div>
    );
  }

  if (fhevmStatus === "error") {
    return <p className="text-red-600">FHEVM Error: {fhevmError?.message || "Unknown error"}</p>;
  }

  return (
    <div className="flex flex-col w-full pt-6">
      {/* Header */}
      <div className="w-full mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Your Pools</h1>
        <button
          onClick={() => {
            getMyPools();
            loadAllPoolsInfo();
          }}
          disabled={isLoadingPools}
          className="btn-primary text-white font-bold py-2 px-4 text-sm disabled:opacity-50"
        >
          {isLoadingPools ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm mb-4 w-full">
          Error: {error}
        </div>
      )}

      {/* Pools Grid */}
      {isLoadingPools ? (
        <div className="w-full text-center py-12">
          <p className="text-lg text-white">Loading pools...</p>
        </div>
      ) : allPoolsInfo.length === 0 ? (
        <div className="w-full text-center py-12 bg-primary rounded-xl border border-custom">
          <p className="text-lg text-white mb-2">No pools yet</p>
          <p className="text-sm text-gray-400">Go to Create tab to create your first pool!</p>
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {allPoolsInfo.map((pool) => (
            <div
              key={pool.poolId}
              onClick={() => setSelectedPoolId(pool.poolId)}
              className="border border-custom rounded-xl p-6 bg-primary hover:bg-tertiary transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">{pool.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  pool.isActive 
                    ? 'bg-green-500/20 text-green-300 border border-green-500' 
                    : 'bg-red-500/20 text-red-300 border border-red-500'
                }`}>
                  {pool.isActive ? 'Active' : 'Ended'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Target Amount</p>
                  <p className="text-lg font-bold text-white">
                    {Number(pool.targetAmount).toLocaleString()} USDT
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Deposited</p>
                  <p className="text-lg font-bold text-white">
                    {Number(pool.totalDeposited).toLocaleString()} USDT
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400 mb-1">Members</p>
                  <p className="text-lg font-semibold text-white">{pool.memberCount.toString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pool Details Modal */}
      {isModalOpen && poolInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 bg-secondary border-b border-custom px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">{poolInfo.name}</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedPoolId(null);
                }}
                className="text-gray-400 hover:text-white text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Wrapper chia 2 card trái/phải cố định */}
              <div className="flex flex-row gap-6 w-full h-full">
                {/* === LEFT CARD === */}
                <div className="flex flex-col w-1/2 bg-primary border border-custom rounded-xl overflow-hidden">
                  {/* Info Tab Navigation */}
                  <div className="flex border-b border-custom">
                    <button
                      onClick={() => setActiveInfoTab("overview")}
                      className={`flex-1 py-3 font-semibold text-sm ${
                        activeInfoTab === "overview"
                          ? "border-b-2 border-cyan-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveInfoTab("user")}
                      className={`flex-1 py-3 font-semibold text-sm ${
                        activeInfoTab === "user"
                          ? "border-b-2 border-cyan-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      User
                    </button>
                  </div>

                  {/* Info Tab Content */}
                  <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    {activeInfoTab === "overview" ? (
                      <>
                        {/* Pool Overview */}
                        <div className="border border-custom rounded-lg p-4 bg-secondary">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-400">Target:</p>
                              <p className="font-bold text-white">{Number(poolInfo.targetAmount).toLocaleString()} USDT</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Total Deposited:</p>
                              <p className="font-bold text-green-400">{Number(poolInfo.totalDeposited).toLocaleString()} USDT</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Members:</p>
                              <p className="font-bold text-white">{poolInfo.memberCount.toString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Status:</p>
                              <p className={`font-bold ${poolInfo.isActive ? "text-green-400" : "text-red-400"}`}>
                                {poolInfo.isActive ? "Active" : "Ended"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Balance */}
                        {userAddress && poolMembers.includes(userAddress) && (
                          <>
                            <button
                              onClick={() => selectedPoolId !== null && decryptMyBalance(selectedPoolId)}
                              disabled={decryptStatus === "loading" || selectedPoolId === null}
                              className="btn-primary text-white font-bold py-2 px-4 w-full disabled:opacity-50 text-sm"
                            >
                              {decryptStatus === "loading" ? "Decrypting..." : "Decrypt Balance"}
                            </button>
                            {decryptedBalance && (
                              <div className="bg-tertiary border border-custom rounded p-3">
                                <p className="text-sm text-gray-400 mb-1">My Balance:</p>
                                <p className="text-2xl font-bold text-green-400">
                                  {Number(decryptedBalance).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  USDT
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Close Pool */}
                        {poolInfo && poolInfo.creator.toLowerCase() === userAddress?.toLowerCase() && poolInfo.isActive && (
                          <button
                            onClick={async () => {
                              if (selectedPoolId === null) return;
                              if (confirm("Are you sure you want to close this pool? Members can withdraw without penalty.")) {
                                await closePool(selectedPoolId);
                                await getPoolInfo(selectedPoolId);
                              }
                            }}
                            disabled={closePoolStatus === "loading"}
                            className="btn-primary text-white font-bold py-2 px-4 w-full disabled:opacity-50 text-sm bg-red-600 hover:bg-red-700"
                          >
                            {closePoolStatus === "loading" ? "Closing..." : "Close Pool"}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Pool Members */}
                        {poolMembers.length > 0 && (
                          <div className="border border-custom rounded-lg p-4 bg-secondary">
                            <h4 className="font-semibold mb-3 text-white">Pool Members</h4>
                            <div className="bg-tertiary p-2 rounded text-sm space-y-1 font-mono text-white">
                              {poolMembers.map((m, idx) => (
                                <p key={idx}>
                                  {m.toLowerCase() === userAddress?.toLowerCase() ? "→ " : ""}
                                  {m}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Members */}
                        {poolInfo && poolInfo.creator.toLowerCase() === userAddress?.toLowerCase() && (
                          <div className="border border-custom rounded-lg p-4 bg-secondary">
                            <h4 className="font-semibold mb-3 text-white">Add Members</h4>
                            <input
                              type="text"
                              value={newMembers}
                              onChange={(e) => setNewMembers(e.target.value)}
                              placeholder="Comma-separated addresses: 0x123..., 0x456..."
                              className="p-2 border border-custom rounded w-full mb-2 bg-tertiary text-white placeholder-gray-400"
                            />
                            <button
                              onClick={async () => {
                                const members = newMembers
                                  .split(",")
                                  .map((addr) => addr.trim())
                                  .filter(Boolean);
                                if (selectedPoolId !== null) {
                                  await addMembers(selectedPoolId, members);
                                  if (addMembersStatus === "success") {
                                    setNewMembers("");
                                    await getPoolInfo(selectedPoolId);
                                    await getPoolMembers(selectedPoolId);
                                  }
                                }
                              }}
                              disabled={addMembersStatus === "loading" || !newMembers.trim()}
                              className="btn-primary text-white font-bold py-2 px-4 w-full disabled:opacity-50 text-sm"
                            >
                              {addMembersStatus === "loading" ? "Adding..." : "Add Members"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* === RIGHT CARD === */}
                <div className="flex flex-col w-1/2 bg-primary border border-custom rounded-xl p-6 overflow-y-auto">
                  <div className="flex border-b border-custom mb-4">
                    <button
                      onClick={() => setActiveActionTab("deposit")}
                      className={`flex-1 py-3 font-semibold text-sm ${
                        activeActionTab === "deposit"
                          ? "border-b-2 border-cyan-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setActiveActionTab("withdraw")}
                      className={`flex-1 py-3 font-semibold text-sm ${
                        activeActionTab === "withdraw"
                          ? "border-b-2 border-cyan-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Withdraw
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto">
                    {activeActionTab === "deposit" ? (
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-white">Amount (USDT):</label>
                        <input
                          type="text"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="e.g., 100"
                          className="p-2 border border-custom rounded w-full bg-secondary text-white placeholder-gray-400"
                        />
                        <button
                          onClick={async () => {
                            if (selectedPoolId === null) return;
                            await deposit(selectedPoolId, depositAmount);
                            if (depositStatus === "success") {
                              await getPoolInfo(selectedPoolId);
                              setDepositAmount("");
                            }
                          }}
                          disabled={depositStatus === "loading"}
                          className="btn-primary text-white font-bold py-2 px-4 w-full disabled:opacity-50 text-sm"
                        >
                          {depositStatus === "loading" ? "Processing..." : "Deposit"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-amber-500/20 border border-amber-500 rounded p-3 text-sm">
                          <p className="font-semibold mb-1 text-amber-300">⚠️ Two-Step Withdrawal</p>
                          <p className="text-amber-200">
                            1️⃣ Request decrypt → 2️⃣ Oracle confirms → 3️⃣ Transfer back
                          </p>
                        </div>
                        <label className="block text-sm font-medium text-white">Amount (USDT):</label>
                        <input
                          type="text"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="e.g., 50"
                          className="p-2 border border-custom rounded w-full bg-secondary text-white placeholder-gray-400"
                        />
                        <button
                          onClick={async () => {
                            if (selectedPoolId === null) return;
                            const result = await requestWithdraw(selectedPoolId, withdrawAmount);
                            if (result) {
                              setWithdrawAmount("");
                              await getPoolInfo(selectedPoolId);
                            }
                          }}
                          disabled={requestWithdrawStatus === "loading"}
                          className="btn-primary text-white font-bold py-2 px-4 w-full disabled:opacity-50 text-sm"
                        >
                          {requestWithdrawStatus === "loading" ? "Requesting..." : "Request Withdraw"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

