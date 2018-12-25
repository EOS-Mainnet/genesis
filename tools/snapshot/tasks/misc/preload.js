const colors = require('colors/safe')

module.exports = (state, complete) => {

  const util = require('../../utilities'),
        series = require('async').series,
        bn = require('bignumber.js')

  //Set daily totals array to global. Take note of "complete()" assumes this is the only async operation
  const dailyTotals = next => {
    util.period.daily_totals( totals => {
      global.CS_PERIOD_ETH = totals
      console.log(colors.green(`Set Daily Totals: ${totals.length}`))
      next()
    })
  }

  const dailyEosPerEth = next => {
    state.eos_per_eth = new Array(CS_NUMBER_OF_PERIODS).fill(new bn(0))
    state.eos_per_eth = state.eos_per_eth.map( (item, i) => {
      let eth_buys = CS_PERIOD_ETH[i],
          tokens_available = new bn( i == 0 ? CS_CREATE_FIRST_PERIOD : CS_CREATE_PER_PERIOD )
      return tokens_available.div(eth_buys)
    })
    // console.log(CS_PERIOD_ETH)
    // console.log(state.eos_per_eth[0].toFixed(18))
    next()
  }

  //If more than one, adapt the above.
  series([
    dailyTotals,
    dailyEosPerEth,
  ],
 () => complete(null, state))

}
