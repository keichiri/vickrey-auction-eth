pragma solidity 0.4.24;


/// @title Contract implementng VickreyAuction on Ethereum
///        The item that is being sold is represented by a opaque string
///        which should be hash of the item's digital version.
///        If there is only single revealer, price is set to his bid.
///        This encourages confident bidders to reveal very late.
///        NOTE - in order to prevent non-reveals additional fee can be added
///        NOTE - does not include paying currently. That is for future
///        iteration. Paying can be done in 2 ways:
///          1. everyone pays same deposit when bidding. If later full payment
///             by the winner is not provided, his deposit is taken and given to other
///             participants or owner
///          2. everyone says money when making bids that should be equal or greater
///             than the actual bid (to hide the actual value)
/// @author Janko Krstic <keichiri@protonmail.com>
contract VickreyAuction {
    address public owner;
    string public item;
    uint public revealStart;
    uint public revealFinish;
    uint public price;
    address public winner;
    mapping (address => Bid) bids;
    uint public bidCount;
    Bid winningBid;

    struct Bid {
        bytes32 hash;
        uint value;
    }

    event NewBid(address bidder);
    event BidReveal(address bidder, uint value);


    constructor(string _item, uint _revealStart, uint _revealFinish) public {
        require(_revealStart > now, "Reveal start must be set in the future");
        require(_revealFinish > _revealStart, "Reveal finish must be set after revealStart");
        require(bytes(_item).length > 0, "Item must not be empty string");

        owner = msg.sender;
        revealStart = _revealStart;
        revealFinish = _revealFinish;
        item = _item;
    }

    function bid(bytes32 hash) public {
        require(now < revealStart, "Bids cannot be made after the reveal phase is started");
        // Imagine if this is actually valid hash, 1 / 2**256
        require(hash != bytes32(0), "Hash cannot be zero");

        Bid storage unrevealedBid = bids[msg.sender];
        if (unrevealedBid.hash == bytes32(0)) {
            bidCount++;
        }

        bids[msg.sender].hash = hash;
        emit NewBid(msg.sender);
    }

    function reveal(uint value, bytes32 nonce) public {
        require(now > revealStart && now < revealFinish, "Reveal can be made only during reveal phase");

        Bid storage unrevealedBid = bids[msg.sender];
        require(unrevealedBid.hash != bytes32(0), "Did not bid");
        require(unrevealedBid.value == 0, "Already revealed");

        bytes memory input = abi.encodePacked(value, nonce);
        bytes32 hash = sha256(input);
        require(hash == unrevealedBid.hash, "Revealed data not correct");

        unrevealedBid.value = value;
        emit BidReveal(msg.sender, value);

        // Setting the largest so far
        if (unrevealedBid.value > winningBid.value) {
            if (price != 0) {
                price = winningBid.value;
            } else {
                price = unrevealedBid.value;
            }

            winningBid = unrevealedBid;
            winner = msg.sender;
        }
    }

    function isOpen() public view returns (bool) {
        return now < revealStart;
    }

    function getWinningBid() public view returns (bytes32, uint) {
        return (winningBid.hash, winningBid.value);
    }

    // Only for easier testing
    function createHash(uint value, bytes32 nonce) public pure returns (bytes32) {
        return sha256(abi.encodePacked(value, nonce));
    }
}
