// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

interface IGunnerERC20 is IERC20 {
    function burn(uint256 amount) external;
}

interface IGunnerERC721 is IERC721Enumerable {
    function maxSupply() external pure returns (uint256);
}

/// @title GunnerBro ERC20 token distributor
/// @author 0xRektora
/// @notice Distribute a constant amount of tokens available to claim each month
contract GunnerTokenDistributor is Ownable {
    IGunnerERC20 public immutable gunnerERC20;
    IGunnerERC721 public immutable gunnerERC721;

    uint256 public blockStartTime = 0;
    uint256 public blockEndTime = 0;

    uint256 public holdingsAtCreation;

    mapping(uint256 => uint256) public nftClaimedTimes;

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
            claim(gunnerERC721.tokenOfOwnerByIndex(msg.sender, i));
        }
    }

    function claim(uint256 _tokenId) public isActive {
        address owner = gunnerERC721.ownerOf(_tokenId);
        require(owner == msg.sender, 'GunnerTokenDistributor::claim Not the owner');

        (uint256 rewards, uint256 accruedRewards) = claimableRewards(_tokenId);
        require(rewards > 0, 'GunnerTokenDistributor::claim No claimable rewards');

        nftClaimedTimes[_tokenId] += accruedRewards;

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

    function claimableRewards(uint256 _tokenId) public view returns (uint256, uint256) {
        uint256 claimedTimes = nftClaimedTimes[_tokenId];
        uint256 monthsPassed = (block.timestamp - blockStartTime) / 60 / 60 / 24 / 30 + 1;
        uint256 accruedRewards = monthsPassed > claimedTimes ? monthsPassed - claimedTimes : 0;
        return (accruedRewards * monthlyShare(), accruedRewards);
    }

    function monthlyShare() public view returns (uint256) {
        return holdingsAtCreation / gunnerERC721.maxSupply() / 12;
    }
}
