import { expect } from 'chai';
import { ethers } from 'hardhat';

const setBalance = async (addr: string, ether: number) => {
  await ethers.provider.send('hardhat_setBalance', [
    addr,
    ethers.utils.hexStripZeros(ethers.utils.parseEther(String(ether))._hex),
  ]);
};

const getAddresses = async () => {
  const [operationsWallet, gunnerTokenDistributor, gunnerEmission, minter1, minter2] = [...Array(5).keys()].map((e) =>
    ethers.Wallet.createRandom(),
  );
  await setBalance(minter1.address, 10000);
  await setBalance(minter2.address, 10000);
  const erc20 = await (await ethers.getContractFactory('GunnerERC20')).deploy();
  const erc721 = await (await ethers.getContractFactory('GunnerBros')).deploy('');

  const contract = await (await ethers.getContractFactory('GunnerTokenAirdrop')).deploy(erc20.address, erc721.address);

  await (
    await erc20.mint(operationsWallet.address, gunnerEmission.address, contract.address, gunnerTokenDistributor.address)
  ).wait();

  await (await erc721.mint(minter1.address)).wait();
  await (await erc721.mint(minter2.address)).wait();

  return {
    deployer: (await ethers.getSigners())[0],
    contract,
    erc20,
    erc721,
    minter1: new ethers.Wallet(minter1.privateKey, ethers.provider),
    minter2: new ethers.Wallet(minter2.privateKey, ethers.provider),
  };
};

describe('GunnerTokenAirdrop', () => {
  beforeEach(async () => await ethers.provider.send('hardhat_reset', []));
  describe('claim', () => {
    it('Should claim 1000 $BRO', async () => {
      const addr = await getAddresses();
      // Minter 1
      await setBalance(addr.minter1.address, 1);
      await (await addr.contract.initiateContract()).wait();
      await (await addr.contract.connect(addr.minter1).claim(1)).wait();
      expect(await addr.erc20.balanceOf(addr.minter1.address)).to.be.above(
        ethers.BigNumber.from(1000).mul(ethers.BigNumber.from(10).pow(18)),
      );
      // Minter 2
      await setBalance(addr.minter2.address, 1);
      await (await addr.contract.connect(addr.minter2).claim(2)).wait();
      expect(await addr.erc20.balanceOf(addr.minter2.address)).to.be.above(
        ethers.BigNumber.from(1000).mul(ethers.BigNumber.from(10).pow(18)),
      );
    });
    it("Shouldn't be claimed if 30 days passed", async () => {
      const addr = await getAddresses();
      await (await addr.contract.initiateContract()).wait();
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 30]);
      await expect(addr.contract.connect(addr.minter1).claim(0)).to.be.revertedWith(
        'GunnerTokenAirdrop::claim Airdrop finished',
      );
    });
    it("Shouldn't be claimed if not in posession of the desired NFT", async () => {
      const addr = await getAddresses();
      await setBalance(addr.minter1.address, 1);
      await (await addr.contract.initiateContract()).wait();
      await expect(addr.contract.connect(addr.minter1).claim(2)).to.be.revertedWith(
        'GunnerTokenAirdrop::claim Not the owner',
      );
    });
  });

  describe('burnRemaining', () => {
    it('Should be called by owner', async () => {
      const addr = await getAddresses();
      await expect(addr.contract.connect(addr.minter1).burnRemaining()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 30]);
      await expect(addr.contract.burnRemaining()).to.not.be.reverted;
    });

    it('Should be called after 30 days', async () => {
      const addr = await getAddresses();
      await expect(addr.contract.burnRemaining()).to.be.revertedWith(
        'GunnerTokenAirdrop::burnRemaining Burn can only occur after the airdrop is over',
      );
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 30]);
      await expect(addr.contract.burnRemaining()).to.not.be.reverted;
    });

    it('Should burn all of the non-claimed contract holdings', async () => {
      const addr = await getAddresses();
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 30]);
      await (await addr.contract.burnRemaining()).wait();
      expect(await addr.erc20.balanceOf(addr.contract.address)).to.be.equal(ethers.BigNumber.from(0));
    });
  });
});
