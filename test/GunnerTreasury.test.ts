import { expect } from 'chai';
import { ethers } from 'hardhat';

const getAddresses = async () => {
  const [operationsWallet, gunnerTokenDistributor, gunnerTokenAirdrop, gunnerEmission] = [...Array(4).keys()].map((e) =>
    ethers.Wallet.createRandom(),
  );
  const erc20 = await (await ethers.getContractFactory('GunnerERC20')).deploy();
  const contract = await (await ethers.getContractFactory('GunnerTreasury')).deploy(erc20.address);

  await (
    await erc20.mint(operationsWallet.address, gunnerEmission.address, gunnerTokenAirdrop.address, contract.address)
  ).wait();

  return {
    deployer: (await ethers.getSigners())[0],
    contract,
    erc20,
    operationsWallet,
    gunnerTokenDistributor,
    gunnerTokenAirdrop,
  };
};
const setBalance = async (addr: string, ether: number) => {
  await ethers.provider.send('hardhat_setBalance', [
    addr,
    ethers.utils.hexStripZeros(ethers.utils.parseEther(String(ether))._hex),
  ]);
};

describe('GunnerTreasury', () => {
  describe('initiateContract', () => {
    it('Should initiate the contract if not already', async () => {
      const addr = await getAddresses();
      await expect(addr.contract.initiateContract()).to.not.be.reverted;
      await expect(addr.contract.initiateContract()).to.be.revertedWith(
        'GunnerTreasury::initiateContract Contract already initiated',
      );
    });
    it('Should not initiate the contract has no funds', async () => {
      const addr = await getAddresses();
      const erc20 = await (await ethers.getContractFactory('GunnerERC20')).deploy();
      const contract = await (await ethers.getContractFactory('GunnerTreasury')).deploy(addr.erc20.address);
      // Addresses does not matter
      await (
        await erc20.mint(
          addr.operationsWallet.address,
          addr.gunnerTokenDistributor.address,
          addr.gunnerTokenAirdrop.address,
          addr.contract.address,
        )
      ).wait();
      await expect(contract.initiateContract()).to.be.revertedWith(
        'GunnerTreasury::initiateContract Insufficient amount',
      );
    });
  });

  describe('isInitialized', () => {
    it('Should not let withdrawal if contract unintialized', async () => {
      const addr = await getAddresses();
      await expect(addr.contract.withdraw(addr.deployer.address, 20)).to.be.revertedWith(
        'GunnerTreasury::isInitialized Contract is not initialized',
      );
      await (await addr.contract.initiateContract()).wait();
      await expect(addr.contract.withdraw(addr.deployer.address, 20)).to.not.be.reverted;
    });
    it('Should not let updateGracePeriod if contract unintialized', async () => {
      const addr = await getAddresses();
      await expect(addr.contract.updateGracePeriod(20)).to.be.revertedWith(
        'GunnerTreasury::isInitialized Contract is not initialized',
      );
      await (await addr.contract.initiateContract()).wait();
      await expect(addr.contract.updateGracePeriod(200000000000)).to.not.be.reverted;
    });
  });

  describe('withdraw', () => {
    it('Should allow only the owner to withdraw', async () => {
      const addr = await getAddresses();
      const signer = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
      await setBalance(signer.address, 1);
      await (await addr.contract.initiateContract()).wait();
      await expect(addr.contract.connect(signer).withdraw(addr.deployer.address, 20)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      await expect(addr.contract.withdraw(addr.deployer.address, 20)).to.not.be.reverted;
      expect(await addr.erc20.balanceOf(addr.deployer.address)).to.be.equal(ethers.BigNumber.from(20));
    });
    it('Should not allow withdrawals within 24hrs', async () => {
      const addr = await getAddresses();
      await (await addr.contract.initiateContract()).wait();
      await expect(addr.contract.withdraw(addr.deployer.address, 20)).to.not.be.reverted;
      await expect(addr.contract.withdraw(addr.deployer.address, 20)).to.be.revertedWith(
        'GunnerTreasury::withdraw Withdrawal occuring too soon',
      );
      for (let i = 0; i < 20; i++) {
        await ethers.provider.send('evm_mine', []);
      }
      await expect(addr.contract.withdraw(addr.deployer.address, 20)).to.be.revertedWith(
        'GunnerTreasury::withdraw Withdrawals need to be 24h apart',
      );
      await ethers.provider.send('evm_increaseTime', [60 * 60 * 24]);
      await expect(addr.contract.withdraw(addr.deployer.address, 20)).to.not.be.reverted;
    });
  });

  describe('updateGracePeriod', () => {
    it('Should not update the grace period below 24hrs', async () => {
      const addr = await getAddresses();
      await (await addr.contract.initiateContract()).wait();
      await expect(
        addr.contract.updateGracePeriod(
          60 * 60, // 1h
        ),
      ).to.be.revertedWith('GunnerTreasury::updateGracePeriod The period should be superior to 24 hours');
    });
  });
});
