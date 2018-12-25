let db         = require('../models'),
    bn         = require('bignumber.js')

module.exports = ( state, callback ) => {
  let query = `SELECT sum(balance_wallet) FROM wallets`
  // if(!config.include_b1) query = `${query} WHERE address!="${CS_ADDRESS_B1}"`

  db.sequelize
    .query(query, {type: db.sequelize.QueryTypes.SELECT})
    .then( sum => {
      let total  = new bn(parseFloat(sum[0]['sum(balance_wallet)'])),
          expected = new bn(200000000).plus(new bn(CS_MAX_PERIOD_INDEX).times(2000000)).plus(new bn(100000000))

      const diff = total.sub(expected)

      if(diff.lt(SS_ACCEPTABLE_SUPPLY_DEVIATION) && diff.gt(SS_ACCEPTABLE_SUPPLY_DEVIATION*-1))
        state.tests.total_supply = true
      else
        state.tests.total_supply =  `Total supply deviation is ${diff.toFixed(4)}, that's a ${new bn(100).minus(new bn(total).div(new bn(expected)).times(100)).toFixed(16)}% Margin of Error which is too high!`

      callback(null, state)
    })
    .catch( error => { throw new Error(error) })
}
