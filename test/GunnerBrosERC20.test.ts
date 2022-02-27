import { expect } from 'chai';
import { ethers } from 'hardhat';

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
      ethers.utils.hexStripZeros(ethers.utils.parseEther('10000')._hex),
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

  describe('It should send', () => {
    const _to = (n: number) => ethers.BigNumber.from(10).pow(26).mul(n).div(100);
    it('20M to operations', async () => {
      const addr = await getAddresses();
      await (
        await addr.contract.mint(
          addr.operationsWallet.address,
          addr.gunnerEmission.address,
          addr.gunnerTokenAirdrop.address,
          addr.gunnerTokenDistributor.address,
        )
      ).wait();
      expect(await addr.contract.balanceOf(addr.operationsWallet.address)).to.be.eq(_to(20));
    });
    it('10M to emissions', async () => {
      const addr = await getAddresses();
      await (
        await addr.contract.mint(
          addr.operationsWallet.address,
          addr.gunnerEmission.address,
          addr.gunnerTokenAirdrop.address,
          addr.gunnerTokenDistributor.address,
        )
      ).wait();
      expect(await addr.contract.balanceOf(addr.gunnerEmission.address)).to.be.eq(_to(10));
    });
    it('10M to airdrop', async () => {
      const addr = await getAddresses();
      await (
        await addr.contract.mint(
          addr.operationsWallet.address,
          addr.gunnerEmission.address,
          addr.gunnerTokenAirdrop.address,
          addr.gunnerTokenDistributor.address,
        )
      ).wait();
      expect(await addr.contract.balanceOf(addr.gunnerTokenAirdrop.address)).to.be.eq(_to(10));
    });
    it('60M to game rewards', async () => {
      const addr = await getAddresses();
      await (
        await addr.contract.mint(
          addr.operationsWallet.address,
          addr.gunnerEmission.address,
          addr.gunnerTokenAirdrop.address,
          addr.gunnerTokenDistributor.address,
        )
      ).wait();
      expect(await addr.contract.balanceOf(addr.gunnerTokenDistributor.address)).to.be.eq(_to(60));
    });
  });
});
