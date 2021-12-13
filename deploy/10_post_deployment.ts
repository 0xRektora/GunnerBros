import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { assert } from 'console';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const gunnerERC20 = await hre.ethers.getContractAt('GunnerERC20', (await deployments.get('GunnerERC20')).address);
  const gunnerERC721 = await hre.ethers.getContractAt('GunnerBros', (await deployments.get('GunnerBros')).address);
  const gunnerTreasury = await hre.ethers.getContractAt(
    'GunnerTreasury',
    (await deployments.get('GunnerTreasury')).address,
  );
  const gunnerTokenAirdrop = await hre.ethers.getContractAt(
    'GunnerTokenAirdrop',
    (await deployments.get('GunnerTokenAirdrop')).address,
  );
  const gunnerTokenDistributor = await hre.ethers.getContractAt(
    'GunnerTokenDistributor',
    (await deployments.get('GunnerTokenDistributor')).address,
  );

  await (await gunnerTreasury.initiateContract()).wait();
  await (await gunnerTokenAirdrop.initiateContract()).wait();
  await (await gunnerTokenDistributor.initiateContract()).wait();

  // Correct ERC20 address
  assert((await gunnerTreasury.gunnerERC20()) === gunnerERC20.address);
  assert((await gunnerTokenAirdrop.gunnerERC20()) === gunnerERC20.address);
  assert((await gunnerTokenDistributor.gunnerERC20()) === gunnerERC20.address);

  // Correct ERC721 address
  assert((await gunnerTokenAirdrop.gunnerERC721()) === gunnerERC721.address);
  assert((await gunnerTokenDistributor.gunnerERC721()) === gunnerERC721.address);
};
export default func;
func.tags = ['GunnerTokenDistributor'];
func.dependencies = ['GunnerERC20', 'GunnerBros', 'GunnerTreasury', 'GunnerTokenAirdrop', 'GunnerTokenDistributor'];
