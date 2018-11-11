const VickreyAuction = artifacts.require("./VickreyAuction.sol");


async function assertRevert(promise) {
  try {
    await promise;
    assert.fail("Expected revert no received");
  } catch (error) {
    let revertExists = error.message.search("revert") >= 0;
    assert(revertExists, `Expected "revert", got ${error} instead`);
  }
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


  beforeEach(async() => {
    now = (new Date()).getTime() / 1000;
    goodRevealStartTime = now + 2;
    goodRevealFinishTime = now + 4;
    auction = await VickreyAuction.new(item, goodRevealStartTime, goodRevealFinishTime);
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
});