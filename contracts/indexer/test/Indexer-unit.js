const Indexer = artifacts.require('Indexer')
const Market = artifacts.require('Market')
const MockContract = artifacts.require('MockContract')
const FungibleToken = artifacts.require('FungibleToken')

const {
  getResult,
  emitted,
  notEmitted,
  reverted,
  equal,
  passes,
} = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { getTimestampPlusDays } = require('@airswap/test-utils').time
const { intents } = require('@airswap/indexer-utils')

const ALICE_LOC = intents.serialize(
  intents.Locators.URL,
  'https://rpc.maker-cloud.io:1123'
)

contract('Indexer Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[2]
  let bobAddress = accounts[3]

  const MIN_STAKE_250 = 250
  const MIN_STAKE_500 = 500

  let indexer
  let indexerAddress

  let stakingTokenTemplate
  let stakingTokenMock
  let stakingTokenAddress

  let tokenOne = accounts[8]
  let tokenTwo = accounts[9]

  setupMockToken = async () => {
    stakingTokenTemplate = await FungibleToken.new()
    stakingTokenMock = await MockContract.new()
    stakingTokenAddress = stakingTokenMock.address
  }

  checkMarketAtAddress = async (marketAddress, makerToken, takerToken) => {
    // find the market
    let market = await Market.at(marketAddress)

    // fetch its tokens
    let marketMakerToken = await market.makerToken()
    let marketTakerToken = await market.takerToken()

    // check it has the correct tokens
    equal(
      marketMakerToken,
      makerToken,
      'Indexer has returned Market with incorrect maker token'
    )
    equal(
      marketTakerToken,
      takerToken,
      'Indexer has returned Market with incorrect taker token'
    )
  }

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Setup contracts', async () => {
    await setupMockToken()
    indexer = await Indexer.new(stakingTokenAddress, MIN_STAKE_250)
    indexerAddress = indexer.address
  })

  describe('Check constructor', async () => {
    it('should set the staking token address correctly', async () => {
      const actualAddress = await indexer.stakeToken()
      equal(
        actualAddress,
        stakingTokenAddress,
        'Staking token was set incorrectly'
      )
    })

    it('should set the staking minimum correctly', async () => {
      const actualMinimum = await indexer.stakeMinimum()
      equal(actualMinimum, MIN_STAKE_250, 'Staking minimum was set incorrectly')
    })

    it('should emit an event in the constructor', async () => {
      // create a new indexer
      const newIndexer = await Indexer.new(stakingTokenAddress, MIN_STAKE_250)

      // get the tx hash and get the transaction result from it
      let txHash = newIndexer.transactionHash
      let result = await getResult(newIndexer, txHash)

      emitted(result, 'SetStakeMinimum', event => {
        return event.amount.toNumber() === MIN_STAKE_250
      })
    })
  })

  describe('Test setStakeMinimum', async () => {
    it('should not allow a non-owner to change the minimum', async () => {
      await reverted(
        indexer.setStakeMinimum(MIN_STAKE_500, {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to change the minimum', async () => {
      let result = await indexer.setStakeMinimum(MIN_STAKE_500, { from: owner })
      emitted(result, 'SetStakeMinimum', event => {
        return event.amount.toNumber() === MIN_STAKE_500
      })
    })
  })

  describe('Test createMarket and createTwoSidedMarket', async () => {
    it('createMarket should emit an event and create a new market', async () => {
      let result = await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // event is emitted
      emitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenOne && event.takerToken === tokenTwo
      })

      // and a market with the correct tokens has been created
      let marketAddress = await indexer.createMarket.call(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      await checkMarketAtAddress(marketAddress, tokenOne, tokenTwo)
    })

    it('createMarket should just return an address if the market exists', async () => {
      // create the market - so that it already exists
      await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // now trying to create it again will not emit the event
      let result = await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      notEmitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenOne && event.takerToken === tokenTwo
      })

      // instead the market's address is returned
      let marketAddress = await indexer.createMarket.call(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      await checkMarketAtAddress(marketAddress, tokenOne, tokenTwo)
    })

    it('createTwoSidedMarket should create 2 new markets if they dont exist', async () => {
      let result = await indexer.createTwoSidedMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // 2 events are emitted - one for each market
      emitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenOne && event.takerToken === tokenTwo
      })
      emitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenTwo && event.takerToken === tokenOne
      })

      // and 2 markets with the correct tokens have been created
      markets = await indexer.createTwoSidedMarket.call(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      await checkMarketAtAddress(markets[0], tokenOne, tokenTwo)
      await checkMarketAtAddress(markets[1], tokenTwo, tokenOne)
    })

    it('createTwoSidedMarket should just return 2 addresses if they exist', async () => {
      // create the 2 markets so they already exist
      await indexer.createTwoSidedMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // now trying to create it again will not emit the event
      let result = await indexer.createMarket(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      notEmitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenOne && event.takerToken === tokenTwo
      })
      notEmitted(result, 'CreateMarket', event => {
        return event.makerToken === tokenTwo && event.takerToken === tokenOne
      })

      // instead the markets' addresses are returned
      markets = await indexer.createTwoSidedMarket.call(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      await checkMarketAtAddress(markets[0], tokenOne, tokenTwo)
      await checkMarketAtAddress(markets[1], tokenTwo, tokenOne)
    })
  })

  describe('Test addToBlacklist and removeFromBlacklist', async () => {
    it('should not allow a non-owner to blacklist a token', async () => {
      await reverted(
        indexer.addToBlacklist(tokenOne, {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to blacklist a token', async () => {
      let result = await indexer.addToBlacklist(tokenOne, {
        from: owner,
      })

      // check the event was emitted
      emitted(result, 'AddToBlacklist', event => {
        return event.token === tokenOne
      })

      // get the timestamp of the block that added the token to the blacklist
      let txTimestamp = (await web3.eth.getBlock(result.receipt.blockHash))
        .timestamp

      // check the token is now on the blacklist
      let isBlacklisted = await indexer.blacklist.call(tokenOne)
      equal(
        txTimestamp,
        isBlacklisted,
        'token was not blacklisted with correct timestamp'
      )
    })

    it('should not allow a non-owner to un-blacklist a token', async () => {
      await reverted(
        indexer.removeFromBlacklist(tokenOne, {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to un-blacklist a token', async () => {
      // removing from blacklist before the token is blacklisted emits no events
      let result = await indexer.removeFromBlacklist(tokenOne, {
        from: owner,
      })
      notEmitted(result, 'RemoveFromBlacklist')
      passes(result)

      // Add the token to the blacklist
      await indexer.addToBlacklist(tokenOne, {
        from: owner,
      })

      // Now removing it succeeds and emits an event
      result = await indexer.removeFromBlacklist(tokenOne, {
        from: owner,
      })
      emitted(result, 'RemoveFromBlacklist', event => {
        return event.token === tokenOne
      })
      passes(result)
    })
  })

  describe('Test setIntent', async () => {
    it('should not set an intent if the market doesnt exist')
    it('should not set an intent if the minimim stake isnt met')
    it('should not set an intent if a token is blacklisted')
    it('should not set an intent if the user has already staked')
    it('should set a valid intent and emit an event')
  })

  describe('Test setTwoSidedIntent', async () => {
    it('should not set either intent if 1 breaks a rule')
    it('should set 2 valid intents and emit 2 events')
  })
})
