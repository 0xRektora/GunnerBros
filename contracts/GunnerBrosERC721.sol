// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract GunnerBros is ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter public tokenIds;

    string private baseUri;
    uint256 constant maxCap = 9999;

    constructor(string memory __baseUri) ERC721('GunnerBros', 'GNB') {
        baseUri = __baseUri;
    }

    function mint(address _to) public onlyOwner returns (uint256) {
        require(tokenIds.current() < maxCap, 'GunnerBros::mint All NFTs have been minted');
        tokenIds.increment();

        uint256 newItemId = tokenIds.current();
        _safeMint(_to, newItemId);

        return newItemId;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseUri;
    }
}
