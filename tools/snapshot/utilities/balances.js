const async             = require('async'),
      bn                = require('bignumber.js')

const util = {
  block: require('./blocks'),
  misc: require('./misc'),
  period: require('./periods')
}

let balances = {}

//Best for polling (fast)
balances.wallet_token_state = (address, callback) => {
  const contract = require('../helpers/web3-contract')
  contract.$token.methods.balanceOf( address ).call()
    .then( balance => {
      balance = new bn( balance )
      callback( balance )
    })
    .catch( e => { throw new Error(e)} )
}

//Required for snapshots (slow)
balances.wallet_cumulative = ( transfers, callback) => {
  balance = transfers.reduce( (acc, current) => acc.plus(current), new bn(0) )
  callback( balance )
}

balances.unclaimed = ( buys, claims, period_max, callback) => {
  let unclaimed
  const periods = util.misc.iota(Number(CS_NUMBER_OF_PERIODS)).map(i => {
    let period = {}
    period.tokens_available = new bn( i == 0 ? CS_CREATE_FIRST_PERIOD : CS_CREATE_PER_PERIOD )
    period.total_eth  = CS_PERIOD_ETH[i]
    period.buys = buys[i]
    period.share = !period.buys || period.total_eth.equals(0)
      ? new bn(0)
      : period.tokens_available.div(period.total_eth).times(period.buys)
    period.claimed = claims[i]
    return period
  })
  unclaimed = new bn(
    periods
      //Get periods by unclaimed and lte last block
      .filter( (period, i) => { return i <= (period_max || CS_MAX_PERIOD_INDEX) && !period.claimed && period.buys.gt(0) })
      //Sum the pre-calculated EOS balance of each resulting period
      .reduce( (sum, period) => period.share.plus(sum), new bn(0) )
  )
  callback( unclaimed )
}

// Some users mistakenly sent their tokens to the contract or token address. Here we recover them if it is the case.
balances.reclaimed = ( reclaimables, callback ) => {
  let reclaimed_balance = new bn(0)
  if(!reclaimables || !reclaimables.length) {
    callback( reclaimed_balance )
  }
  else {
    // reclaimed_balance = new bn( reclaimables.reduce( (sum, tx) => sum.plus( new bn(tx.value) ), new bn(0) ) )
    for( let tx of reclaimables ) {
      reclaimed_balance = new bn(tx.value).plus( reclaimed_balance ) //Stored in database from_wei for consistency, convert back to wei, so patterns are consistent
    }
    // console.log(`INFO: ${address} reclaimed ${reclaimed_balance.div(WAD)} EOS`)
    callback( reclaimed_balance )
  }
}

module.exports = balances
