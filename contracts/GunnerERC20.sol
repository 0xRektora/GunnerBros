// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract GunnerERC20 is ERC20Burnable, ERC20Capped {
    uint256 constant supply = 100 * 1e6 * 1e18;

    constructor() ERC20("Gunner", "BRO") ERC20Capped(supply) {}

    function mint(
        address _operations,
        address _emissions,
        address _airdrop,
        address _gameRewards
    ) public {
        ERC20._mint(_operations, (supply * 20) / 100); // 20%
        ERC20._mint(_emissions, (supply * 10) / 100); // 10%
        ERC20._mint(_airdrop, (supply * 10) / 100); // 10%
        ERC20._mint(_gameRewards, (supply * 20) / 100); // 60%
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Capped)
    {
        super._mint(to, amount);
    }
}
