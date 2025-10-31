import { useState, useCallback, useEffect } from "react";
import { Contract, ethers } from "ethers";

import { HushSaveABI } from "@/abi/HushSaveABI";
import { HushSaveAddresses } from "@/abi/HushSaveAddresses";
import { PublicTokenABI } from "@/abi/PublicTokenABI";
import { PublicTokenAddresses } from "@/abi/PublicTokenAddresses";

interface UseHushSaveProps {
  fhevmInstance: any;
  ethersSigner: ethers.Signer | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  chainId: number | undefined;
}

interface PoolInfo {
  name: string;
  targetAmount: string;
  totalDeposited: string;
  startTime: bigint;
  duration: bigint;
  isActive: boolean;
  memberCount: bigint;
  creator: string;
}

export function useHushSave({
  fhevmInstance,
  ethersSigner,
  ethersReadonlyProvider,
  chainId,
}: UseHushSaveProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  
  // Separate states for different operations
  const [createPoolStatus, setCreatePoolStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [depositStatus, setDepositStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [requestWithdrawStatus, setRequestWithdrawStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [addMembersStatus, setAddMembersStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [closePoolStatus, setClosePoolStatus] = useState<"idle" | "loading" | "error" | "success">("idle");

  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [poolMembers, setPoolMembers] = useState<string[]>([]);
  const [myPools, setMyPools] = useState<number[]>([]);
  const [userAddress, setUserAddress] = useState<string>("");
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [myEncryptedBalance, setMyEncryptedBalance] = useState<string | null>(null);
  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  const [decryptStatus, setDecryptStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [allowDecryptStatus, setAllowDecryptStatus] = useState<"idle" | "loading" | "error" | "success">("idle");

  // Lấy địa chỉ contract từ Sepolia
  const CONTRACT_ADDRESS = HushSaveAddresses["11155111"].address;
  const TOKEN_ADDRESS = PublicTokenAddresses["11155111"].address;

  const getContract = useCallback(() => {
    if (!ethersSigner && !ethersReadonlyProvider) return null;
    return new Contract(CONTRACT_ADDRESS, HushSaveABI.abi, ethersSigner || ethersReadonlyProvider);
  }, [ethersSigner, ethersReadonlyProvider]);

  const getTokenContract = useCallback(() => {
    if (!ethersSigner && !ethersReadonlyProvider) return null;
    return new Contract(TOKEN_ADDRESS, PublicTokenABI.abi, ethersSigner || ethersReadonlyProvider);
  }, [ethersSigner, ethersReadonlyProvider]);

  // Owner: Tạo pool mới
  const createPool = useCallback(
    async (name: string, targetAmountUsdt: string, durationDays: number) => {
      if (!ethersSigner) return;
      try {
        setCreatePoolStatus("loading");
        setError(null);

        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        const targetAmount = ethers.parseUnits(targetAmountUsdt, 6); // USDT có 6 decimals
        
        // Gọi transaction
        const tx = await contract.createPool(name, targetAmount, durationDays);
        
        // Chờ confirm
        const receipt = await tx.wait();
        
        // Lấy event PoolCreated để có poolId
        let poolId: number | null = null;
        if (receipt.logs) {
          for (const log of receipt.logs) {
            try {
              const parsedLog = contract.interface.parseLog(log);
              if (parsedLog && parsedLog.name === "PoolCreated") {
                poolId = Number(parsedLog.args[0]);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }

        setCreatePoolStatus("success");
        return { hash: tx.hash, poolId };
      } catch (err: any) {
        console.error(err);
        setError(err.message);
        setCreatePoolStatus("error");
        return null;
      }
    },
    [ethersSigner, getContract]
  );

  // Owner: Thêm members vào pool
  const addMembers = useCallback(
    async (poolId: number, members: string[]) => {
      if (!ethersSigner) return;
      try {
        setAddMembersStatus("loading");
        setError(null);

        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        const tx = await contract.addMembers(poolId, members);
        await tx.wait();

        setAddMembersStatus("success");
        alert(`Added ${members.length} member(s) to pool!`);
      } catch (err: any) {
        let errorMsg = err.reason || err.message || "Failed to add members";
        if (err.message?.includes("Not pool creator")) {
          errorMsg = "Only the pool creator can add members.";
        }
        setError(errorMsg);
        setAddMembersStatus("error");
      }
    },
    [ethersSigner, getContract]
  );

  // Owner: Đóng pool sớm
  const closePool = useCallback(
    async (poolId: number): Promise<boolean> => {
      if (!ethersSigner) return false;
      try {
        setClosePoolStatus("loading");
        setError(null);

        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        const tx = await contract.closePool(poolId);
        await tx.wait();

        setClosePoolStatus("success");
        alert("Pool closed successfully!");
        return true;
      } catch (err: any) {
        let errorMsg = err.reason || err.message || "Failed to close pool";
        if (err.message?.includes("Not pool creator")) {
          errorMsg = "Only the pool creator can close the pool.";
        }
        setError(errorMsg);
        setClosePoolStatus("error");
        return false;
      }
    },
    [ethersSigner, getContract]
  );

  // User: Nạp tiền vào pool
  const deposit = useCallback(
    async (poolId: number, clearAmountUsdt: string) => {
      if (!fhevmInstance || !ethersSigner || !chainId) return;
      
      // Validate input
      const amount = parseFloat(clearAmountUsdt);
      if (isNaN(amount) || amount <= 0) {
        setError("Amount must be greater than 0");
        return;
      }

      try {
        setDepositStatus("loading");
        setError(null);

        const contract = getContract();
        const tokenContract = getTokenContract();
        if (!contract || !tokenContract) throw new Error("Contract not available");

        const clearAmount = ethers.parseUnits(clearAmountUsdt, 6); // USDT có 6 decimals
        const userAddress = await ethersSigner.getAddress();
        
        console.log("🔵 Step 1: Checking token balance...");
        // Bước 1: Kiểm tra số dư token
        const userBalance = await tokenContract.balanceOf(userAddress);
        if (userBalance < clearAmount) {
          throw new Error(`❌ Insufficient balance. You have ${ethers.formatUnits(userBalance, 6)} USDT but need ${clearAmountUsdt} USDT.`);
        }
        console.log("✅ Sufficient balance");

        console.log("🔵 Step 2: Checking allowance...");
        // Bước 2: Kiểm tra allowance hiện tại
        const currentAllowance = await tokenContract.allowance(userAddress, CONTRACT_ADDRESS);
        
        if (currentAllowance < clearAmount) {
          console.log("🔵 Approving tokens...");
          // Approve token cho contract nếu chưa đủ
          const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, clearAmount);
          console.log("⏳ Waiting for approval confirmation...");
          await approveTx.wait();
          console.log("✅ Approval successful");
        } else {
          console.log("✅ Already approved, skipping...");
        }

        console.log("🔵 Step 3: Creating encrypted input...");
        // Bước 3: Tạo encrypted input
        const input = fhevmInstance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
        input.add128(clearAmount);
        const encryptedAmount = await input.encrypt();
        console.log("✅ Encryption successful");

        console.log("🔵 Step 4: Calling deposit...");
        // Bước 4: Gọi deposit với encrypted amount
        const tx = await contract.deposit(
          poolId,
          clearAmount,
          encryptedAmount.handles[0],
          encryptedAmount.inputProof
        );
        console.log("⏳ Waiting for deposit confirmation...");
        await tx.wait();
        console.log("✅ Deposit successful!");

        setDepositStatus("success");
        // Refresh pool info - will be called by parent component
      } catch (err: any) {
        console.error("❌ Deposit error:", err);
        
        // Better error message
        let errorMsg = err.message || "Unknown error";
        
        // Common error cases
        if (err.code === "CALL_EXCEPTION" || err.reason?.includes("revert")) {
          if (err.message?.includes("Not in pool")) {
            errorMsg = "❌ You are not a member of this pool. Ask the owner to add you first.";
          } else if (err.message?.includes("Pool ended")) {
            errorMsg = "❌ This pool has ended and is inactive.";
          } else if (err.message?.includes("Amount > 0")) {
            errorMsg = "❌ Amount must be greater than 0.";
          } else {
            errorMsg = "❌ Transaction failed: " + (err.reason || err.message || "Check console for details");
          }
        }
        
        setError(errorMsg);
        setDepositStatus("error");
      }
    },
    [fhevmInstance, ethersSigner, chainId, getContract, getTokenContract, CONTRACT_ADDRESS]
  );

  // User: Rút tiền (two-step: request + complete with oracle decryption)
  const requestWithdraw = useCallback(
    async (poolId: number, clearAmountUsdt: string) => {
      if (!fhevmInstance || !ethersSigner || !chainId) return;
      
      const amount = parseFloat(clearAmountUsdt);
      if (isNaN(amount) || amount <= 0) {
        setError("Amount must be greater than 0");
        return;
      }

      try {
        setRequestWithdrawStatus("loading");
        setError(null);

        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        const clearAmount = ethers.parseUnits(clearAmountUsdt, 6); // USDT có 6 decimals
        const userAddress = await ethersSigner.getAddress();
        
        // Kiểm tra user có phải member không
        const poolMembers = await contract.getPoolMembers(poolId);
        const isMember = poolMembers.includes(userAddress);
        if (!isMember) {
          throw new Error("❌ You are not a member of this pool.");
        }

        // Tạo encrypted input
        const input = fhevmInstance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
        input.add128(clearAmount);
        const encryptedAmount = await input.encrypt();

        // Gọi requestWithdraw - tạo pending request với oracle
        const tx = await contract.requestWithdraw(
          poolId,
          clearAmount,
          encryptedAmount.handles[0],
          encryptedAmount.inputProof
        );
        const receipt = await tx.wait();

        // Lấy requestId từ event WithdrawRequested
        let requestId: bigint | null = null;
        if (receipt.logs) {
          for (const log of receipt.logs) {
            try {
              const parsedLog = contract.interface.parseLog(log);
              if (parsedLog && parsedLog.name === "WithdrawRequested") {
                requestId = BigInt(parsedLog.args[2].toString()); // requestId là args[2]
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }

        if (!requestId) {
          throw new Error("Could not get request ID from transaction");
        }

        console.log("🔵 Step 4: Waiting for oracle decryption...");
        console.log("⏳ This may take a few seconds...");
        
        // NOTE: In production, oracle sẽ tự động gọi completeWithdraw
        // Here we need to manually handle it or wait for oracle
        // For now, show success but note that pool will be deducted when completeWithdraw is called
        
        setRequestWithdrawStatus("success");
        setLastRequestId(requestId.toString());
        return { hash: tx.hash, requestId: requestId.toString() };
      } catch (err: any) {
        console.error("❌ Withdraw error:", err);
        let errorMsg = err.message || "Unknown error";
        
        if (err.code === "CALL_EXCEPTION" || err.reason?.includes("revert")) {
          if (err.message?.includes("Not in pool")) {
            errorMsg = "❌ You are not a member of this pool.";
          } else if (err.message?.includes("Pool ended")) {
            errorMsg = "❌ This pool has ended and is inactive.";
          } else if (err.message?.includes("Amount > 0")) {
            errorMsg = "❌ Amount must be greater than 0.";
          } else {
            errorMsg = "❌ Transaction failed: " + (err.reason || err.message || "Check console for details");
          }
        }
        
        setError(errorMsg);
        setRequestWithdrawStatus("error");
        return null;
      }
    },
    [fhevmInstance, ethersSigner, chainId, getContract]
  );

  // Xem thông tin pool
  const getPoolInfo = useCallback(
    async (poolId: number) => {
      if (!ethersReadonlyProvider) return;
      try {
        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        const info = await contract.getPoolInfo(poolId);
        
        // Validate that pool exists (name should not be empty)
        if (info[0]) {
          const poolData = {
            name: info[0],
            targetAmount: ethers.formatUnits(info[1], 6),
            totalDeposited: ethers.formatUnits(info[2], 6),
            startTime: info[3],
            duration: info[4],
            isActive: info[5],
            memberCount: info[6],
            creator: info.length > 7 ? info[7] : ethers.ZeroAddress,
          };
          setPoolInfo(poolData);
        } else {
          setPoolInfo(null);
        }
      } catch (err) {
        console.error("Error getting pool info:", err);
        setPoolInfo(null);
      }
    },
    [ethersReadonlyProvider, getContract]
  );

  // Xem danh sách members của pool
  const getPoolMembers = useCallback(
    async (poolId: number) => {
      if (!ethersReadonlyProvider) return;
      try {
        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        const members = await contract.getPoolMembers(poolId);
        setPoolMembers(members);
      } catch (err) {
        console.error("Error getting pool members:", err);
        setPoolMembers([]); // Set empty array on error
      }
    },
    [ethersReadonlyProvider, getContract]
  );

  // Kiểm tra mục tiêu đạt chưa
  const isGoalReached = useCallback(
    async (poolId: number) => {
      if (!ethersReadonlyProvider) return false;
      try {
        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        return await contract.isGoalReached(poolId);
      } catch (err) {
        console.error(err);
        return false;
      }
    },
    [ethersReadonlyProvider, getContract]
  );

  // Kiểm tra user có thể rút chưa
  const canWithdraw = useCallback(
    async (poolId: number) => {
      if (!ethersReadonlyProvider) return false;
      try {
        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        return await contract.canWithdraw(poolId, userAddress);
      } catch (err) {
        console.error(err);
        return false;
      }
    },
    [ethersReadonlyProvider, getContract, userAddress]
  );

  // Lấy encrypted balance handle của user trong pool
  const getMyEncryptedBalance = useCallback(
    async (poolId: number) => {
      if (!ethersReadonlyProvider) return;
      try {
        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        const balance = await contract.getMyEncryptedBalance(poolId);
        
        // Handle có thể là object hoặc string
        const handle = (balance?.handle as string | undefined) ?? (balance as unknown as string);
        setMyEncryptedBalance(handle || "No balance");
      } catch (err) {
        console.error("Error getting encrypted balance:", err);
        setMyEncryptedBalance("Error");
      }
    },
    [ethersReadonlyProvider, getContract]
  );

  // Decrypt balance để xem giá trị thực tế (tương tự Payroll)
  const decryptMyBalance = useCallback(
    async (poolId: number) => {
      if (!fhevmInstance || !ethersSigner || !chainId) return;
      
      try {
        setDecryptStatus("loading");
        setError(null);

        const contract = getContract();
        if (!contract) throw new Error("Contract not available");

        const userAddr = await ethersSigner.getAddress();
        
        // 1) Lấy ciphertext từ contract
        const balanceEncrypted = await contract.getMyEncryptedBalance(poolId);
        const handle = (balanceEncrypted?.handle as string | undefined) ?? (balanceEncrypted as unknown as string);

        if (!handle) throw new Error("Invalid ciphertext handle");

        // 2) Tạo keypair tạm thời để ký yêu cầu userDecrypt
        const { privateKey, publicKey } = fhevmInstance.generateKeypair();

        // 3) Chuẩn bị EIP-712 và ký
        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = "10";
        const contractAddresses = [CONTRACT_ADDRESS];

        const eip712 = fhevmInstance.createEIP712(
          publicKey,
          contractAddresses,
          startTimeStamp,
          durationDays
        );

        const signature = await (ethersSigner as any).signTypedData(
          eip712.domain,
          { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
          eip712.message
        );

        // 4) Gọi userDecrypt với đầy đủ tham số
        const result = await fhevmInstance.userDecrypt(
          [{ handle, contractAddress: CONTRACT_ADDRESS }],
          privateKey,
          publicKey,
          signature.replace("0x", ""),
          contractAddresses,
          userAddr,
          startTimeStamp,
          durationDays
        );

        const weiBn = result[handle];
        if (typeof weiBn === 'boolean') {
          setError("Invalid balance value");
          setDecryptStatus("error");
          return;
        }
        
        // USDT có 6 decimals
        const formattedBalance = ethers.formatUnits(weiBn, 6);
        setDecryptedBalance(formattedBalance);
        setDecryptStatus("success");
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to decrypt balance");
        setDecryptStatus("error");
      }
    },
    [fhevmInstance, ethersSigner, chainId, getContract, CONTRACT_ADDRESS]
  );

  // Lấy danh sách pool của user
  const getMyPools = useCallback(async () => {
    if (!ethersSigner) {
      setMyPools([]);
      return;
    }
    try {
      const contract = getContract();
      if (!contract) {
        setMyPools([]);
        return;
      }

      // Try to call getMyPools - if fails, user has no pools yet
      try {
        const pools = await contract.getMyPools();
        setMyPools(pools.map((p: bigint) => Number(p)));
      } catch (err: any) {
        // If contract not deployed or user has no pools, set empty array
        if (err.code === 'BAD_DATA' || err.message?.includes('decode')) {
          console.log("Contract not deployed or user has no pools yet");
          setMyPools([]);
        } else {
          throw err;
        }
      }
      
      // Get user address
      const addr = await ethersSigner.getAddress();
      setUserAddress(addr);
    } catch (err) {
      console.error("Error getting my pools:", err);
      setMyPools([]);
    }
  }, [ethersSigner, getContract]);

  // Effect để load pools khi signer thay đổi
  useEffect(() => {
    if (ethersSigner) {
      getMyPools();
    } else {
      setUserAddress("");
      setMyPools([]);
    }
  }, [ethersSigner, getMyPools]);

  return {
    status,
    error,
    createPoolStatus,
    depositStatus,
    requestWithdrawStatus,
    addMembersStatus,
    closePoolStatus,
    decryptStatus,
    createPool,
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
    isGoalReached,
    canWithdraw,
    userAddress,
    lastRequestId,
    getMyEncryptedBalance,
    myEncryptedBalance,
    decryptMyBalance,
    decryptedBalance,
  };
}

