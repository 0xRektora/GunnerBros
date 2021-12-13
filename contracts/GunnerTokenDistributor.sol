// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

interface IGunnerERC20 is IERC20 {
    function burn(uint256 amount) external;
}

interface IGunnerERC721 is IERC721Enumerable {
    function maxCap() external view returns (uint256);
}

/// @title GunnerBro ERC20 token distributor
/// @author 0xRektora
/// @notice Distribute a constant amount of tokens available to claim each month
contract GunnerTokenDistributor is Ownable {
    using Counters for Counters.Counter;

    IGunnerERC20 immutable gunnerERC20;
    IGunnerERC721 immutable gunnerERC721;

    uint256 blockStartTime = 0;
    uint256 blockEndTime = 0;

    uint256 holdingsAtCreation;

    mapping(uint256 => Counters.Counter) nftClaimedTimes;

    constructor(address _gunnerErc20, address _gunnerErc721) {
        gunnerERC20 = IGunnerERC20(_gunnerErc20);
        gunnerERC721 = IGunnerERC721(_gunnerErc721);

        blockStartTime = block.timestamp;
        blockEndTime = blockStartTime + 365 days;
    }

    event Claim(uint256 indexed _tokenId, address indexed _to, uint256 _value);

    modifier isActive() {
        require(block.timestamp < blockEndTime, 'GunnerTokenDistributor unactive');
        _;
    }

    function initiateContract() public onlyOwner {
        require(holdingsAtCreation == 0, 'GunnerTokenDistributor::initiateContract Contract already initiated');
        uint256 balance = gunnerERC20.balanceOf(address(this));
        require(balance > 0, 'GunnerTokenDistributor::initiateContract Insufficient amount');

        holdingsAtCreation = balance;
    }

    function claimForAllNFTs() external {
        uint256 tokensInPosession = gunnerERC721.balanceOf(msg.sender);
        for (uint256 i = 0; i < tokensInPosession; i++) {
            this.claim(gunnerERC721.tokenOfOwnerByIndex(msg.sender, i));
        }
    }

    function claim(uint256 _tokenId) external isActive {
        address owner = gunnerERC721.ownerOf(_tokenId);
        require(owner == msg.sender, 'GunnerTokenDistributor::claim Not the owner');

        Counters.Counter storage claimedTimes = nftClaimedTimes[_tokenId];

        uint256 rewards = claimableRewards(_tokenId);
        require(rewards > 0, 'GunnerTokenDistributor::claim No claimable rewards');

        claimedTimes.increment();

        bool transfered = gunnerERC20.transfer(owner, rewards);
        require(transfered, 'GunnerTokenDistributor::claim Error while claiming');

        emit Claim(_tokenId, owner, rewards);
    }

    function burnRemaining() public onlyOwner {
        require(
            block.timestamp > blockEndTime,
            'GunnerTokenDistributor::burnRemaining Burn can only occur after the distribution is over'
        );
        gunnerERC20.burn(gunnerERC20.balanceOf(address(this)));
    }

    function claimableRewards(uint256 _tokenId) public view returns (uint256) {
        Counters.Counter storage claimedTimes = nftClaimedTimes[_tokenId];
        uint256 monthsPassed = (block.timestamp - blockStartTime) / 60 / 60 / 30;
        uint256 accruedRewards = monthsPassed + 1 > claimedTimes.current()
            ? monthsPassed + 1 - claimedTimes.current()
            : 0;
        return accruedRewards * monthlyShare();
    }

    function monthlyShare() public view returns (uint256) {
        return holdingsAtCreation / gunnerERC721.maxCap() / 12;
    }
}
