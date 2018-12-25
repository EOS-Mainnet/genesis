module.exports = ( state, callback ) => {

  const async        = require('async'),
        json_to_csv  = require('json-to-csv'),
        fs           = require('fs'),
        Sequelize    = require('sequelize'),
        Op           = Sequelize.Op,
        db           = require('../../models'),
        bn           = require('bignumber.js')

  const csv = callback => {
    db.Wallets
      .findAll({
        order: [ ['deterministic_index', 'ASC'], ['address', "ASC"] ],
        where: { balance_total: { [Op.gt]: 0 } }
      })
      .then( results => {
        let _results = results
          .filter( result => result.dataValues.address.toLowerCase() != CS_ADDRESS_CROWDSALE.toLowerCase() & result.dataValues.address.toLowerCase() != CS_ADDRESS_TOKEN.toLowerCase()     )
          .map(    result => { return { user: result.dataValues.address, balance: result.dataValues.balance_total } })
        json_to_csv(_results, state.files.path_distribution_csv, false)
          .then(() => {
            console.log(`${results.length} Records Saved to distribution.csv`)
            callback()
          })
          .catch( error => { throw new Error(error) })
      })
      .catch( error => { throw new Error(error) })
  }

  csv( callback )

}
