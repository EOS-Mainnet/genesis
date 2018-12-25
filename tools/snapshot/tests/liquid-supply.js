module.exports = ( state, callback ) => {
  let db         = require('../models'),
      bn         = require('bignumber.js'),
      query    = require('../queries.js')

  query.supply_liquid()
    .then( sum => {
      let liquid,
          expected,
          margin_of_error,
          diff

      liquid = parseFloat(sum[0]['sum(balance_total)'])
      expected = 200000000+(config.period*2000000)+100000000
      diff = new bn(expected).minus(new bn(liquid))
      margin_of_error = new bn(100).minus(new bn(liquid).div(new bn(expected)).times(100)).toFixed(16)

      if( diff.lt(SS_ACCEPTABLE_SUPPLY_DEVIATION) && diff.gt(SS_ACCEPTABLE_SUPPLY_DEVIATION*-1) ) {
        state.tests.liquid_supply = true
      } else {
        state.tests.liquid_supply =  `Liquid supply deviation is ${diff.toFixed(4)}, that's a ${margin_of_error}% Margin of Error which is too high!`
      }

      callback(null, state)

    })
    .catch( error => { throw new Error(error) })

}
