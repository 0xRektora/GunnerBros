import { expect } from 'chai';
import { ethers } from 'hardhat';

const getAddresses = async () => {
  const [operationsWallet, gunnerTokenDistributor, gunnerTokenAirdrop, gunnerEmission] = [...Array(4).keys()].map((e) =>
    ethers.Wallet.createRandom(),
  );
  const contract = await (await ethers.getContractFactory('GunnerBrosMock')).deploy('');

  return {
    deployer: (await ethers.getSigners())[0],
    contract,
    operationsWallet,
    gunnerTokenDistributor,
    gunnerTokenAirdrop,
    gunnerEmission,
  };
};

const setBalance = async (addr: string, ether: number) => {
  await ethers.provider.send('hardhat_setBalance', [
    addr,
    ethers.utils.hexStripZeros(ethers.utils.parseEther(String(ether))._hex),
  ]);
};

describe('GunnerBrosERC721', () => {
  it('Should be minted only by owner', async () => {
    const addr = await getAddresses();
    const signer = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
    await setBalance(signer.address, 1);
    await expect(addr.contract.mint(ethers.Wallet.createRandom().address)).to.be.not.reverted;
    await expect(addr.contract.connect(signer).mint(ethers.Wallet.createRandom().address)).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );
  });
  it('Should have a max cap of 9999', async () => {
    const addr = await getAddresses();
    await addr.contract.setTokenId(9999);
    await expect(addr.contract.mint(ethers.Wallet.createRandom().address)).to.be.revertedWith(
      'GunnerBros::mint All NFTs have been minted',
    );
  });
  it('BaseURI can only be called by owner', async () => {
    const addr = await getAddresses();
    const signer = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
    await setBalance(signer.address,1000)
    await expect(addr.contract.connect(signer).setBaseURI('_')).to.be.revertedWith('Ownable: caller is not the owner');
    await expect(addr.contract.setBaseURI('_')).to.not.be.reverted;
  });
});
