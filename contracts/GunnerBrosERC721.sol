// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

contract GunnerBros is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter public tokenIds;

    string private baseUri;
    uint16 public constant maxSupply = 9999;

    constructor(string memory __baseUri) ERC721('GunnerBros', 'GNB') {
        baseUri = __baseUri;
    }

    function mint(address _to) public onlyOwner returns (uint256 newItemId) {
        require(tokenIds.current() < maxSupply, 'GunnerBros::mint All NFTs have been minted');

        tokenIds.increment();
        newItemId = tokenIds.current();
        _safeMint(_to, newItemId);
    }

    function setBaseURI(string calldata _to) external onlyOwner {
        baseUri = _to;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseUri;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
