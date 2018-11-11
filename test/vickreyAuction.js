const VickreyAuction = artifacts.require("./VickreyAuction.sol");
const crypto = require('crypto');


async function assertRevert(promise) {
  try {
    await promise;
    assert.fail("Expected revert no received");
  } catch (error) {
    let revertExists = error.message.search("revert") >= 0;
    assert(revertExists, `Expected "revert", got ${error} instead`);
  }
}

async function retrieveEvent(tx, eventName) {
  const { logs } = await tx;
  return logs.find(e => e.event === eventName);
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sha256(input) {
  let hasher = crypto.createHash('sha256');
  hasher.update(input, 'binary');
  return hasher.digest('binary');
}

contract("VickreyAuction", accounts => {
  let auction;
  let owner = accounts[0];
  let bidder1 = accounts[1];
  let bidder2 = accounts[2];
  let bidder3 = accounts[3];
  let nonBidder = accounts[4];
  let item = "12345123451234512345";
  let now;
  let goodRevealStartTime;
  let goodRevealFinishTime;
  let nonce1;
  let bid1 = 1000;
  let hash1;


  beforeEach(async() => {
    now = (new Date()).getTime() / 1000;
    goodRevealStartTime = now + 2;
    goodRevealFinishTime = now + 4;
    nonce1 = sha256(Math.floor(Math.random() * 100000).toString()); // for simplicity
    auction = await VickreyAuction.new(item, goodRevealStartTime, goodRevealFinishTime);
    hash1 = await auction.createHash(bid1, nonce1);
    assert.ok(auction);
  });

  describe("Constructor", () => {
    it("Fails if start is in past", async() => {
      await assertRevert(VickreyAuction.new(item, now - 1, goodRevealFinishTime));
    });

    it("Fails if finish not greater than reveal time", async() => {
      await assertRevert(VickreyAuction.new(item, goodRevealStartTime, goodRevealStartTime));
    });

    it("Sets initial state properly", async() => {
      let bidCount = await auction.bidCount();
      let open = await auction.isOpen();
      let auctionOwner = await auction.owner();
      let price = await auction.price();

      assert.equal(bidCount, 0);
      assert.equal(open, true);
      assert.equal(owner, auctionOwner);
      assert.equal(price, 0);
    });
  });

  describe("Bidding", () => {
    it("Works if input is correct", async() => {
      await auction.bid(hash1, {from: bidder1});

      let bidCount = await auction.bidCount();

      assert.equal(bidCount, 1);
    });

    it("Allows to bid 2 times", async() => {
      await auction.bid(hash1, {from: bidder1});
      await auction.bid(hash1, {from: bidder1});

      let bidCount = await auction.bidCount();

      assert.equal(bidCount, 1);
    });

    it("Reverts if called after reveal starts", async() => {
      await sleep(2000);

      await assertRevert(auction.bid(hash1, {from: bidder1}));
    });
  });

  describe("Revealing", () => {
    beforeEach(async() => {
      await auction.bid(hash1, {from: bidder1});
    });

    it("Sets the largest", async() => {
      await sleep(3000); // TODO - find a better way for this
      await auction.reveal(bid1, nonce1, {from: bidder1});
      let winningBid = await auction.getWinningBid();
      let price = await auction.price();
      let winner = await auction.winner();

      assert.equal(winningBid[0], hash1);
      assert.equal(winningBid[1], bid1);
      assert.equal(winner, bidder1);
      assert.equal(price, bid1);
    });

    it("Emits BidReveal event", async() => {
      await sleep(3000);
      let tx = await auction.reveal(bid1, nonce1, {from: bidder1});
      let event = await retrieveEvent(tx, "BidReveal");

      assert.equal(event.args.bidder, bidder1);
      assert.equal(event.args.value, bid1);
    });

    it("Sets winning bid and price correctly if multiple bids", async() => {
      let bid2 = 2000;
      let nonce2 = sha256(Math.floor(Math.random() * 100000).toString()); // for simplicity
      let hash2 = await auction.createHash(bid2, nonce2);
      await auction.bid(hash2, {from: bidder2});

      let bid3 = 500;
      let nonce3 = sha256(Math.floor(Math.random() * 1000000).toString());
      let hash3 = await auction.createHash(bid3, nonce3);
      await auction.bid(hash3, {from: bidder3});

      await sleep(3000);

      await auction.reveal(bid1, nonce1, {from: bidder1});
      await auction.reveal(bid2, nonce2, {from: bidder2});
      await auction.reveal(bid3, nonce3, {from: bidder3});

      let winningBid = await auction.getWinningBid();
      let price = await auction.price();
      let winner = await auction.winner();

      assert.equal(winningBid[0], hash2);
      assert.equal(winningBid[1], bid2);
      assert.equal(price, bid1);
      assert.equal(winner, bidder2);
    });

    it("Reverts if wrong value", async() => {
      await sleep(3000);
      await assertRevert(auction.reveal(bid1 + 1, nonce1, {from: bidder1}));
    });

    it("Reverts if wrong nonce", async() => {
      await sleep(3000);
      await assertRevert(auction.reveal(bid1, sha256("some data"), {from: bidder1}));
    });

    it("Reverts if revealing not open", async() => {
      await assertRevert(auction.reveal(bid1, nonce1, {from: bidder1}));
    });

    it("Reverts if revealing finished", async() => {
      await sleep(5000);
      await assertRevert(auction.reveal(bid1, nonce1, {from: bidder1}));
    });

    it("Reverts if did not bid", async() => {
      await sleep(3000);
      await assertRevert(auction.reveal(bid1, nonce1, {from: nonBidder}));
    });

    it("Reverts if already revealed", async() => {
      await sleep(3000);
      await auction.reveal(bid1, nonce1, {from: bidder1});
      await assertRevert(auction.reveal(bid1, nonce1, {from: bidder1}));
    });
  });

});