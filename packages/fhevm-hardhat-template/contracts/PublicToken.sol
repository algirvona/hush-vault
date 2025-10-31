// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PublicToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**6; // 1 tỷ token với 6 decimals
    uint256 public constant USER_MINT_AMOUNT = 1000 * 10**6; // 1000 token với 6 decimals
    mapping(address => bool) public hasMinted; // lưu trạng thái user đã mint

    constructor() ERC20("PublicToken", "USDT") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    // Owner mint thêm, không giới hạn
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // User chỉ được mint 1 lần 1000 token
    function userMint() external {
        require(!hasMinted[msg.sender], "Already minted");
        hasMinted[msg.sender] = true;
        _mint(msg.sender, USER_MINT_AMOUNT);
    }

    // Override decimals để giống USDT (6 decimals)
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
