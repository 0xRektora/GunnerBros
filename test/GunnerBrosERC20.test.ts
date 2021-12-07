import { ethers } from 'hardhat'
import { expect } from 'chai'
import { GunnerERC20 } from '../typechain'
import { Wallet } from '@ethersproject/wallet'

describe('GunnerBrosERC20', () => {
  let gunnerERC20: GunnerERC20,
    operationsWallet: Wallet,
    gunnerTokenDistributor,
    gunnerTokenAirdrop

  beforeEach(async () => {
    operationsWallet = ethers.Wallet.createRandom()
    gunnerERC20 = await (
      await ethers.getContractFactory('GunnerERC20')
    ).deploy()
  })

  it('Can be minted only by the owner', async () => {
    await expect(
      gunnerERC20.mint(
        operationsWallet.address,
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address,
        { from: operationsWallet.address },
      ),
    ).to.be.reverted
  })

  it('Should have a 100M supply', async () => {})
})
