module.exports = ( state, complete ) => {

  const query = require('../../queries'),
        base32 = require('hi-base32'),
        eachOfSeries = require('async').eachOfSeries,
        db = require('../../models')

  let cache = "",
      cache_count = 0,
      total = 0

  console.log('account names')

  const set_account_name = (wallet, key, callback) => {
    let account_name = base32.encode( wallet.deterministic_index.toString() ).replace(/=/g, "").toLowerCase()
    if(account_name.length > 12) { throw new Error(`${account_name} is greater than 12 characters`) }
    // else if (account_name.length == 12) { console.log(`${wallet.address}:${wallet.deterministic_index} is exactly 12 characters`) }
    else if (wallet.address == CS_ADDRESS_B1 ) { account_name = "b1" }
    else { account_name = account_name.padEnd(12, "genesis11111") }
    // cache+=`UPDATE wallets SET account_name="${account_name}" WHERE address="${wallet.address}";`
    if(cache_count!=0) cache+=', '
    cache+=`("${wallet.address}", "${account_name}")`
    cache_count++
    // console.log(cache_count)
    if(cache_count>=100 || key+1==total ) {
      let query = `INSERT into wallets (address,account_name) VALUES ${cache} ON DUPLICATE KEY UPDATE account_name=VALUES(account_name)`
      // console.log(key+1==total, query)
      db.sequelize.query(query)
        .then( res => {
          cache = ""
          cache_count = 0
          callback()
        })
        .catch( e => {throw new Error(e)} )
    } else {
      callback()
    }
  }

  const loop_finished = err => {
    console.log('finished')
    complete(null, state)
  }

  query.address_deterministic_indices( results => {
    total = results.length
    eachOfSeries(results, set_account_name, loop_finished)
  })
}
