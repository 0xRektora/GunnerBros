import { ethers } from 'hardhat';
import { expect } from 'chai';
import { GunnerERC20 } from '../typechain';
import { Wallet } from '@ethersproject/wallet';

const getAddresses = async () => {
  const [operationsWallet, gunnerTokenDistributor, gunnerTokenAirdrop, gunnerEmission] = [...Array(4).keys()].map((e) =>
    ethers.Wallet.createRandom(),
  );
  const contract = await (await ethers.getContractFactory('GunnerERC20')).deploy();

  return {
    deployer: (await ethers.getSigners())[0],
    contract,
    operationsWallet,
    gunnerTokenDistributor,
    gunnerTokenAirdrop,
    gunnerEmission,
  };
};

describe('GunnerBrosERC20', () => {
  it('Can be minted only by the owner', async () => {
    const addr = await getAddresses();
    const signer = new ethers.Wallet(addr.gunnerEmission.privateKey, ethers.provider);
    await ethers.provider.send('hardhat_setBalance', [
      signer.address,
      ethers.utils.hexStripZeros(ethers.utils.parseEther('0.1')._hex),
    ]);
    await expect(
      addr.contract
        .connect(signer)
        .mint(
          addr.operationsWallet.address,
          addr.gunnerEmission.address,
          addr.gunnerTokenAirdrop.address,
          addr.gunnerTokenDistributor.address,
        ),
    ).to.be.reverted;
    await expect(
      addr.contract.mint(
        addr.operationsWallet.address,
        addr.gunnerEmission.address,
        addr.gunnerTokenAirdrop.address,
        addr.gunnerTokenDistributor.address,
      ),
    ).to.not.be.reverted;
  });

  it('Should have a 100M supply', async () => {
    const addr = await getAddresses();
    await (
      await addr.contract.mint(
        addr.operationsWallet.address,
        addr.gunnerEmission.address,
        addr.gunnerTokenAirdrop.address,
        addr.gunnerTokenDistributor.address,
      )
    ).wait();
    expect(await addr.contract.totalSupply()).to.be.equal(ethers.BigNumber.from(10).pow(26));
    await expect(
      addr.contract.mint(
        addr.operationsWallet.address,
        addr.gunnerEmission.address,
        addr.gunnerTokenAirdrop.address,
        addr.gunnerTokenDistributor.address,
      ),
    ).to.be.reverted;
  });
});
