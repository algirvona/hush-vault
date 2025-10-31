// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint128, externalEuint128, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract HushSave is SepoliaConfig {
    IERC20 public immutable token;
    address public owner;

    struct SavingsPool {
        string name;
        uint256 targetAmount;
        uint256 totalDeposited;
        uint256 startTime;
        uint256 duration;
        bool isActive;
        bool closedEarly;         // NEW: đóng sớm, rút không phạt
        address creator;
        address[] members;
        mapping(address => euint128) encryptedBalances;
        mapping(address => bool) isMember;
    }

    struct PendingWithdraw {
        uint256 poolId;
        address user;
        euint128 encAmountToSend;
        bool exists;
    }

    mapping(uint256 => PendingWithdraw) public pending;

    uint256 public poolCount;
    mapping(uint256 => SavingsPool) public pools;
    mapping(address => uint256[]) public userPools;

    uint256 public constant EARLY_WITHDRAW_FEE = 10; // %
    uint256 public accumulatedFees; // Track phí tích lũy

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyPoolMember(uint256 poolId) {
        require(pools[poolId].isMember[msg.sender], "Not in pool");
        _;
    }

    modifier onlyPoolCreator(uint256 poolId) {
        require(pools[poolId].creator == msg.sender, "Not pool creator");
        _;
    }

    event PoolCreated(uint256 poolId, string name, uint256 target, uint256 durationDays);
    event PoolClosed(uint256 poolId, uint256 time);                     // NEW
    event MemberAdded(uint256 poolId, address addedBy, address member); // NEW
    event Deposited(uint256 poolId, address user, uint256 clearAmount);
    event WithdrawRequested(uint256 poolId, address user, uint256 requestId);
    event Withdrawn(uint256 poolId, address user, uint256 amount);
    event GoalReached(uint256 poolId, uint256 total);

    constructor(address usdtAddress) {
        owner = msg.sender;
        token = IERC20(usdtAddress);
    }

    // ---------------------------------------------------------------------
    // OWNER / CREATOR
    // ---------------------------------------------------------------------

    /// Max 3 pool ĐANG ACTIVE / creator
    function createPool(
        string calldata name,
        uint256 targetAmount,
        uint256 durationDays
    ) external returns (uint256 poolId) {
        require(targetAmount > 0, "Target > 0");
        require(durationDays > 0, "Duration > 0");
        require(_activePoolCount(msg.sender) < 3, "Max 3 active pools");

        poolId = poolCount++;
        SavingsPool storage pool = pools[poolId];
        pool.name = name;
        pool.targetAmount = targetAmount;
        pool.startTime = block.timestamp;
        pool.duration = durationDays * 1 days;
        pool.isActive = true;
        pool.creator = msg.sender;

        // Add creator into pool
        pool.isMember[msg.sender] = true;
        pool.members.push(msg.sender);
        pool.encryptedBalances[msg.sender] = FHE.asEuint128(0);
        FHE.allowThis(pool.encryptedBalances[msg.sender]);
        FHE.allow(pool.encryptedBalances[msg.sender], msg.sender);

        userPools[msg.sender].push(poolId);

        emit PoolCreated(poolId, name, targetAmount, durationDays);
    }

    /// Đóng sớm: cho phép rút KHÔNG phạt
    function closePool(uint256 poolId) external onlyPoolCreator(poolId) {
        SavingsPool storage pool = pools[poolId];
        require(pool.isActive, "Already closed");
        pool.isActive = false;
        pool.closedEarly = true;
        emit PoolClosed(poolId, block.timestamp);
    }

    /// Creator thêm member (emit rõ ràng)
    function addMembers(uint256 poolId, address[] calldata members) external onlyPoolCreator(poolId) {
        SavingsPool storage pool = pools[poolId];
        require(pool.isActive, "Pool inactive");

        for (uint256 i = 0; i < members.length; i++) {
            address m = members[i];
            if (!pool.isMember[m]) {
                pool.isMember[m] = true;
                pool.members.push(m);
                pool.encryptedBalances[m] = FHE.asEuint128(0);
                FHE.allowThis(pool.encryptedBalances[m]);
                FHE.allow(pool.encryptedBalances[m], m);
                userPools[m].push(poolId); // Add pool to member's pool list
                emit MemberAdded(poolId, msg.sender, m);
            }
        }
    }

    // ---------------------------------------------------------------------
    // USER
    // ---------------------------------------------------------------------
    function deposit(
        uint256 poolId,
        uint256 clearAmount,
        externalEuint128 inputEuint,
        bytes calldata proof
    ) external onlyPoolMember(poolId) {
        require(clearAmount > 0, "Amount > 0");
        SavingsPool storage pool = pools[poolId];
        require(pool.isActive, "Pool ended");

        euint128 encAmt = FHE.fromExternal(inputEuint, proof);

        pool.encryptedBalances[msg.sender] = FHE.add(
            pool.encryptedBalances[msg.sender],
            encAmt
        );
        pool.totalDeposited += clearAmount;

        require(token.transferFrom(msg.sender, address(this), clearAmount), "Transfer failed");

        FHE.allowThis(pool.encryptedBalances[msg.sender]);
        FHE.allow(pool.encryptedBalances[msg.sender], msg.sender);

        if (pool.totalDeposited >= pool.targetAmount) {
            emit GoalReached(poolId, pool.totalDeposited);
        }

        emit Deposited(poolId, msg.sender, clearAmount);
    }

    function requestWithdraw(
        uint256 poolId,
        uint256 clearAmount,
        externalEuint128 inputEuint,
        bytes calldata proof
    ) external onlyPoolMember(poolId) {
        require(clearAmount > 0, "Amount > 0");
        require(clearAmount <= type(uint128).max, "Too big");
        SavingsPool storage pool = pools[poolId];

        // Cho phép rút nếu: đang active HOẶC đã đóng sớm HOẶC đã hết hạn
        bool timeUp = block.timestamp >= pool.startTime + pool.duration;
        require(pool.isActive || pool.closedEarly || timeUp, "Pool closed");

        euint128 encReq = FHE.fromExternal(inputEuint, proof);
        euint128 userBal = pool.encryptedBalances[msg.sender];
        ebool reqLEBal = FHE.le(encReq, userBal);
        euint128 encSent = FHE.select(reqLEBal, encReq, FHE.asEuint128(0));

        // Allow permissions cho contract và user
        FHE.allow(encSent, address(this));
        FHE.allow(encSent, msg.sender);

        // Dùng FHE.requestDecryption() thay vì manual call oracle
        // FHE lib sẽ tự động: allowForDecryption + gọi oracle + save handles
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(encSent);
        uint256 requestId = FHE.requestDecryption(
            cts,
            this.completeWithdraw.selector
        );

        pending[requestId] = PendingWithdraw({
            poolId: poolId,
            user: msg.sender,
            encAmountToSend: encSent,
            exists: true
        });

        emit WithdrawRequested(poolId, msg.sender, requestId);
    }

    function completeWithdraw(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof  // Version 0.8.0 API
    ) public {
        require(pending[requestId].exists, "No pending request");
        PendingWithdraw storage p = pending[requestId];
        SavingsPool storage pool = pools[p.poolId];

        // Verify oracle signatures (version 0.8.0)
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        uint128 decryptedAmount = abi.decode(cleartexts, (uint128));

        bool goalReached = pool.totalDeposited >= pool.targetAmount;
        bool timeUp = block.timestamp >= pool.startTime + pool.duration;

        uint256 amountToSend = uint256(decryptedAmount);
        uint256 fee = 0;
        
        // Nếu chưa đạt goal và chưa hết hạn và KHÔNG đóng sớm -> phạt
        if (!goalReached && !timeUp && !pool.closedEarly) {
            fee = (amountToSend * EARLY_WITHDRAW_FEE) / 100;
            amountToSend -= fee;
            accumulatedFees += fee; // Track phí tích lũy
        }

        require(token.transfer(p.user, amountToSend), "Transfer failed");

        pool.encryptedBalances[p.user] = FHE.sub(pool.encryptedBalances[p.user], p.encAmountToSend);
        FHE.allowThis(pool.encryptedBalances[p.user]);
        FHE.allow(pool.encryptedBalances[p.user], p.user);

        pool.totalDeposited -= uint256(decryptedAmount);

        emit Withdrawn(p.poolId, p.user, amountToSend); // Emit số thực gửi cho user (sau phí)
        delete pending[requestId];
    }

    // ---------------------------------------------------------------------
    // VIEW
    // ---------------------------------------------------------------------
    function getMyEncryptedBalance(uint256 poolId) external view onlyPoolMember(poolId) returns (euint128) {
        return pools[poolId].encryptedBalances[msg.sender];
    }

    function allowDecryptMyBalance(uint256 poolId) external onlyPoolMember(poolId) {
        FHE.allow(pools[poolId].encryptedBalances[msg.sender], msg.sender);
    }

    /// ABI MỚI: trả thêm creator + closedEarly
    function getPoolInfo(uint256 poolId) external view returns (
        string memory name,
        uint256 targetAmount,
        uint256 totalDeposited,
        uint256 startTime,
        uint256 duration,
        bool isActive,
        uint256 memberCount,
        address creator,
        bool closedEarly
    ) {
        SavingsPool storage pool = pools[poolId];
        return (
            pool.name,
            pool.targetAmount,
            pool.totalDeposited,
            pool.startTime,
            pool.duration,
            pool.isActive,
            pool.members.length,
            pool.creator,
            pool.closedEarly
        );
    }

    function getPoolMembers(uint256 poolId) external view returns (address[] memory) {
        return pools[poolId].members;
    }

    function getMyPools() external view returns (uint256[] memory) {
        return userPools[msg.sender];
    }

    // ---------------------------------------------------------------------
    // INTERNAL
    // ---------------------------------------------------------------------
    function _activePoolCount(address user) internal view returns (uint256 count) {
        uint256[] memory ids = userPools[user];
        for (uint256 i = 0; i < ids.length; i++) {
            if (pools[ids[i]].isActive) count++;
        }
    }
}
