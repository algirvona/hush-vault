import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPayrollETH = await deploy("PayrollETH", {
    from: deployer,
    args: [], // constructor không nhận tham số
    log: true,
  });

  console.log(`✅ PayrollETH deployed at: ${deployedPayrollETH.address}`);
};

export default func;
func.id = "deploy_payroll_eth";
func.tags = ["PayrollETH"];
