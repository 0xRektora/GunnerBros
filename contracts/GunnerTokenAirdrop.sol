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

/// @title GunnerBro ERC20 token Airdrop
/// @author 0xRektora
/// @notice $GunnerBros ERC721 holder can claim the $Gunner ERC20 tokens within 1 month after launch
contract GunnerTokenAirdrop is Ownable {
    uint256 public blockEndTime = 0;

    IGunnerERC20 public immutable gunnerERC20;
    IGunnerERC721 public immutable gunnerERC721;

    uint256 public holdingsAtCreation;

    mapping(uint256 => bool) public claimed;

    constructor(address _gunnerErc20, address _gunnerErc721) {
        gunnerERC20 = IGunnerERC20(_gunnerErc20);
        gunnerERC721 = IGunnerERC721(_gunnerErc721);

        blockEndTime = block.timestamp + 30 days;
    }

    event Claim(uint256 indexed _tokenId, address indexed _to, uint256 _value);

    function initiateContract() public onlyOwner {
        require(holdingsAtCreation == 0, 'GunnerTokenAirdrop::initiateContract Contract already initiated');
        uint256 balance = gunnerERC20.balanceOf(address(this));
        require(balance > 0, 'GunnerTokenAirdrop::initiateContract Insufficient amount');

        holdingsAtCreation = balance;
    }

    function claim(uint256 _tokenId) public {
        require(holdingsAtCreation > 0, 'GunnerTokenAirdrop::claim Contract not initiated');
        require(block.timestamp < blockEndTime, 'GunnerTokenAirdrop::claim Airdrop finished');
        require(!isClaimed(_tokenId), 'GunnerTokenAirdrop::claim Airdrop already claimed');
        require(gunnerERC721.ownerOf(_tokenId) == msg.sender, 'GunnerTokenAirdrop::claim Not the owner');

        uint256 value = sharesPerNFT();
        bool success = gunnerERC20.transfer(msg.sender, sharesPerNFT());

        require(success, 'GunnerTokenAirdrop::claim ERC20 token transfer failed');
        emit Claim(_tokenId, msg.sender, value);
    }

    function isClaimed(uint256 _tokenId) public view returns (bool) {
        return claimed[_tokenId];
    }

    function sharesPerNFT() public view returns (uint256) {
        return holdingsAtCreation / gunnerERC721.maxSupply();
    }

    function burnRemaining() public onlyOwner {
        require(
            block.timestamp > blockEndTime,
            'GunnerTokenAirdrop::burnRemaining Burn can only occur after the airdrop is over'
        );
        gunnerERC20.burn(gunnerERC20.balanceOf(address(this)));
    }
}
