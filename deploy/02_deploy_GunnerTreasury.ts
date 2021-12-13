import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const gunnerERC20 = await deployments.get('GunnerERC20');

  await deploy('GunnerTreasury', {
    from: deployer,
    log: true,
    args: [gunnerERC20.address],
  });
};
export default func;
func.tags = ['GunnerTreasury'];
func.dependencies = ['GunnerERC20'];
