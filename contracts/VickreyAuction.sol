pragma solidity 0.4.24;


/// @title Contract implementng VickreyAuction on Ethereum
///        The item that is being sold is represented by a opaque string
///        which should be hash of the item's digital version.
/// @author Janko Krstic <keichiri@protonmail.com>
contract VickreyAuction {
    address public owner;
    string public item;
    uint public revealStart;
    uint public revealFinish;
    uint public price;
    mapping (address => Bid) bids;
    uint public bidCount;
    Bid public winningBid;

    struct Bid {
        bytes32 hash;
        int value;
    }

    event NewBid(address bidder);


    constructor(string _item, uint _revealStart, uint _revealFinish) {
        require(_revealStart > now, "Reveal start must be set in the future");
        require(_revealFinish > _revealStart, "Reveal finish must be set after revealStart");
        require(bytes(_item).length > 0, "Item must not be empty string");

        owner = msg.sender;
        revealStart = _revealStart;
        revealFinish = _revealFinish;
        item = _item;
    }

    function isOpen() public view returns (bool) {
        return now < revealStart;
    }
}
