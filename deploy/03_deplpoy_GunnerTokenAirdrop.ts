import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const gunnerERC20 = await deployments.get('GunnerERC20');
  const gunnerERC721 = await deployments.get('GunnerBros');

  await deploy('GunnerTokenAirdrop', {
    from: deployer,
    log: true,
    args: [gunnerERC20.address, gunnerERC721.address],
  });
};
export default func;
func.tags = ['GunnerTokenAirdrop'];
func.dependencies = ['GunnerERC20', 'GunnerBros'];
