// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import '../GunnerBrosERC721.sol';

contract GunnerBrosMock is GunnerBros {
    constructor(string memory __baseUri) GunnerBros(__baseUri) {}

    function setTokenId(uint256 _to) public {
        tokenIds._value = _to;
    }
}
