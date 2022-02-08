import { expect } from 'chai';
import { ethers } from 'hardhat';

const setBalance = async (addr: string, ether: number) => {
  await ethers.provider.send('hardhat_setBalance', [
    addr,
    ethers.utils.hexStripZeros(ethers.utils.parseEther(String(ether))._hex),
  ]);
};

const getAddresses = async () => {
  const [operationsWallet, gunnerTreasury, gunnerTokenAirdrop, minter1, minter2] = [...Array(5).keys()].map((e) =>
    ethers.Wallet.createRandom(),
  );
  await setBalance(minter1.address, 10000);
  await setBalance(minter2.address, 10000);
  const erc20 = await (await ethers.getContractFactory('GunnerERC20')).deploy();
  const erc721 = await (await ethers.getContractFactory('GunnerBros')).deploy('');

  const contract = await (await ethers.getContractFactory('GunnerTokenDistributor')).deploy(
    erc20.address,
    erc721.address,
  );

  await (
    await erc20.mint(operationsWallet.address, contract.address, gunnerTokenAirdrop.address, gunnerTreasury.address)
  ).wait();

  await (await erc721.mint(minter1.address)).wait();
  await (await erc721.mint(minter2.address)).wait();

  await (await contract.initiateContract()).wait();

  return {
    deployer: (await ethers.getSigners())[0],
    contract,
    erc20,
    erc721,
    minter1: new ethers.Wallet(minter1.privateKey, ethers.provider),
    minter2: new ethers.Wallet(minter2.privateKey, ethers.provider),
  };
};

describe('GunnerTokenDistributor', () => {
  describe('isActive', () => {
    it('Should not be able to claim if unactive (365 days later)', async () => {
      const addr = await getAddresses();
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 365]);
      await expect(addr.contract.claim(0)).to.be.revertedWith('GunnerTokenDistributor unactive');
    });
  });

  describe('claim', () => {
    it("Shouldn't be able to claim if it's not the owner of the NFT", async () => {
      const addr = await getAddresses();
      await expect(addr.contract.connect(addr.minter1).claim(2)).to.be.revertedWith(
        'GunnerTokenDistributor::claim Not the owner',
      );
    });

    it("Shouldn't be able to claim if already claimed within the same month with same hands", async () => {
      const addr = await getAddresses();
      await setBalance(addr.minter1.address, 200);
      await (await addr.contract.connect(addr.minter1).claim(1)).wait();
      await expect(addr.contract.connect(addr.minter1).claim(1)).to.be.revertedWith(
        'GunnerTokenDistributor::claim No claimable rewards',
      );
    });

    it("Shouldn't be able to claim if already claimed within the same month with different hands", async () => {
      const addr = await getAddresses();
      await setBalance(addr.minter1.address, 200);
      await (await addr.contract.connect(addr.minter1).claim(1)).wait();
      await (
        await addr.erc721.connect(addr.minter1).transferFrom(addr.minter1.address, addr.minter2.address, 1)
      ).wait();
      await expect(addr.contract.connect(addr.minter2).claim(1)).to.be.revertedWith(
        'GunnerTokenDistributor::claim No claimable rewards',
      );
    });

    it('Shouldn be able to claim if hands changed', async () => {
      const addr = await getAddresses();
      await setBalance(addr.minter1.address, 200);
      await (await addr.contract.connect(addr.minter1).claim(1)).wait();
      await (
        await addr.erc721.connect(addr.minter1).transferFrom(addr.minter1.address, addr.minter2.address, 1)
      ).wait();
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 30]);
      await expect(addr.contract.connect(addr.minter1).claim(1)).to.be.revertedWith(
        'GunnerTokenDistributor::claim Not the owner',
      );
      await expect(addr.contract.connect(addr.minter2).claim(1)).to.not.be.reverted;
    });

    it('Should be able to claim 1 month of rewards equal to 83 $BRO', async () => {
      const addr = await getAddresses();
      await setBalance(addr.minter1.address, 200);
      await (await addr.contract.connect(addr.minter1).claim(1)).wait();
      const _above = ethers.BigNumber.from(1000).mul(ethers.BigNumber.from(10).pow(18)).div(12);
      const _below = _above.add(ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18)));
      expect(await addr.erc20.balanceOf(addr.minter1.address))
        .to.be.above(_above)
        .and.below(_below);

      // Wait to next month and get reward
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 30]);
      await addr.erc20.connect(addr.minter1).burn(await addr.erc20.balanceOf(addr.minter1.address));
      await (await addr.contract.connect(addr.minter1).claim(1)).wait();
      expect(await addr.erc20.balanceOf(addr.minter1.address))
        .to.be.above(_above)
        .and.below(_below);
    });

    it('Should be able to claim 3 month of rewards equal to 250 $BRO', async () => {
      const addr = await getAddresses();
      await setBalance(addr.minter1.address, 200);
      const _above = ethers.BigNumber.from(1000).mul(3).mul(ethers.BigNumber.from(10).pow(18)).div(12);
      const _below = _above.add(ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18)));
      // Wait to 2 months and get rewards
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 30 * 2]);
      await (await addr.contract.connect(addr.minter1).claim(1)).wait();
      expect(await addr.erc20.balanceOf(addr.minter1.address))
        .to.be.above(_above)
        .and.below(_below);

      // Wait to 2 months and get rewards
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 30 * 3]);
      await addr.erc20.connect(addr.minter1).burn(await addr.erc20.balanceOf(addr.minter1.address));
      await (await addr.contract.connect(addr.minter1).claim(1)).wait();
      expect(await addr.erc20.balanceOf(addr.minter1.address))
        .to.be.above(_above)
        .and.below(_below);
    });
  });

  describe('claimForAllNFTs', () => {
    it('Should be able to claim 1 NFT rewards equal to 83 $BRO', async () => {
      const addr = await getAddresses();
      await setBalance(addr.minter1.address, 200);
      await (await addr.contract.connect(addr.minter1).claimForAllNFTs()).wait();
      const _above = ethers.BigNumber.from(1000).mul(ethers.BigNumber.from(10).pow(18)).div(12);
      const _below = _above.add(ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18)));
      expect(await addr.erc20.balanceOf(addr.minter1.address))
        .to.be.above(_above)
        .and.below(_below);
    });
    it('Should be able to claim 3 NFT rewards equal to 250 $BRO', async () => {
      const addr = await getAddresses();
      await setBalance(addr.minter1.address, 200);
      await (await addr.erc721.mint(addr.minter1.address)).wait();
      await (await addr.erc721.mint(addr.minter1.address)).wait();
      await (await addr.contract.connect(addr.minter1).claimForAllNFTs()).wait();
      const _above = ethers.BigNumber.from(1000).mul(3).mul(ethers.BigNumber.from(10).pow(18)).div(12);
      const _below = _above.add(ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18)));
      expect(await addr.erc20.balanceOf(addr.minter1.address))
        .to.be.above(_above)
        .and.below(_below);
    });
  });
});
