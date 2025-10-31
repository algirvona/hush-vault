import hre from "hardhat";

async function main() {
  // 👉 Địa chỉ PublicToken (USDT) đã deploy trước đó
  const PUBLIC_TOKEN_ADDRESS = "0x18a6689cf0080428BB272672Aac36C09c2B92aae";

  console.log("🚀 Deploying HushSave with token:", PUBLIC_TOKEN_ADDRESS);

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy HushSave sử dụng hardhat-deploy
  const deployedHushSave = await deploy("HushSave", {
    from: deployer,
    args: [PUBLIC_TOKEN_ADDRESS], // truyền token address vào constructor
    log: true,
  });

  console.log("✅ HushSave deployed to:", deployedHushSave.address);
  console.log("🔗 Linked to PublicToken (USDT) at:", PUBLIC_TOKEN_ADDRESS);
}

// Run script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
