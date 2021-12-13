// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

interface IGunnerERC20 is IERC20 {}

/// @title GunnerBro ERC20 token treasury
/// @author 0xRektora
/// @notice Hold an open a certain amount of tokens per period
contract GunnerTreasury is Ownable {
    IGunnerERC20 public immutable gunnerERC20;

    uint256 public constant minGracePeriod = 24 hours;
    // Prevent the 14 sec timestamp attack
    // We assume 1 block = 2sec (Polygon & Ethereum)
    uint256 public constant minBlockMargin = 10;

    uint256 public gracePeriod = minGracePeriod;

    uint256 public maxWithdrawPerPeriod;
    Withdrawal public lastWithdrawal;

    struct Withdrawal {
        uint256 blockNumber;
        uint256 timestamp;
        uint256 amount;
    }

    constructor(address _gunnerErc20) {
        gunnerERC20 = IGunnerERC20(_gunnerErc20);
    }

    event Withdraw(address indexed _to, uint256 _amount);

    modifier isInitialized() {
        require(maxWithdrawPerPeriod != 0, 'GunnerTreasury::isInitialized Contract is not initialized');
        _;
    }

    function initiateContract() public onlyOwner {
        require(maxWithdrawPerPeriod == 0, 'GunnerTreasury::initiateContract Contract already initiated');
        uint256 balance = gunnerERC20.balanceOf(address(this));
        require(balance > 0, 'GunnerTreasury::initiateContract Insufficient amount');

        maxWithdrawPerPeriod = balance / 100; // 1% of the total balance at contract initialization
    }

    function withdraw(address _to, uint256 _amount) public onlyOwner isInitialized {
        require(
            block.number > lastWithdrawal.blockNumber + minBlockMargin,
            'GunnerTreasury::withdraw Withdrawal occuring too soon'
        );
        require(
            block.timestamp > lastWithdrawal.timestamp + minGracePeriod,
            'GunnerTreasury::withdraw Withdrawals need to be 24h apart'
        );

        lastWithdrawal.blockNumber = block.number;
        lastWithdrawal.timestamp = block.timestamp;
        lastWithdrawal.amount = _amount;

        bool success = gunnerERC20.transfer(_to, _amount);
        require(success, 'GunnerTreasury::withdraw Error while transferring assets');

        emit Withdraw(_to, _amount);
    }

    function updateGracePeriod(uint256 newPeriod) public onlyOwner isInitialized {
        require(
            newPeriod > minGracePeriod,
            'GunnerTreasury::updateGracePeriod The period should be superior to 24 hours'
        );
        gracePeriod = newPeriod;
    }
}
