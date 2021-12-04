// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract GunnerBros is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private tokenIds;

    string private immutable baseUri;

    constructor(string calldata __baseUri) ERC721("GunnerBros", "GNB") {
        baseUri = __baseUri;
    }

    function mint(address _to) public returns (uint256) {
        tokenIds.increment();

        uint256 newItemId = tokenIds.current();
        _mint(_to, newItemId);

        return newItemId;
    }

    function _baseURI() internal view returns (string memory) {
        return baseUri;
    }
}
