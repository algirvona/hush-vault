import hre from "hardhat";

async function main() {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying contracts with:", deployer);

  // Triển khai PublicToken sử dụng hardhat-deploy
  const deployedToken = await deploy("PublicToken", {
    from: deployer,
    args: [], // constructor không nhận tham số
    log: true,
  });

  console.log("PublicToken deployed to:", deployedToken.address);

  // Mint thêm 1,000,000 token cho owner (6 decimals)
  const mintAmount = hre.ethers.parseUnits("1000000", 6); // 1,000,000 với 6 decimals
  const tokenContract = await hre.ethers.getContractAt("PublicToken", deployedToken.address);
  const tx = await tokenContract.ownerMint(deployer, mintAmount);
  await tx.wait();

  console.log(`Minted ${mintAmount.toString()} tokens to owner: ${deployer}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
