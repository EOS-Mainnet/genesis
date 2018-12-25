module.exports = (state, complete) => {
  const db    = require('../../models'),
        async = require('async'),
        base32 = require('hi-base32'),
        query = require('../../queries')

  let cache = "",
      cache_index = [],

      batch_index = 0,
      batch_total = 10000,

      deterministic_index = 1


  const batch = (batch_complete) => {

   let final

    const get_addresses = (callback) => {
      db.Wallets.findAll({
        attributes: ["address"],
        order: [
          ['first_seen', 'ASC'],
          ['address', 'ASC'],
        ],
        offset : batch_index*batch_total,
        limit: batch_total
      }, {type: db.sequelize.QueryTypes.SELECT})
        .then( addresses => {
          if(addresses.length) {
            console.log(`Deterministic Index: Found ${addresses.length} Addresses (Batch #${batch_index})`)
            callback(null, addresses)
          } else {
            batch_complete(true)
          }
        })
        .catch( e => { throw new Error(e) } )
    }

    const set_deterministic_indices = (addresses, callback) => {
      console.log(`Deterministic Index: Setting Indices`)
      addresses = addresses.map( (address, index) => { return { address: address.dataValues.address, deterministic_index: deterministic_index++ } })
      callback(null, addresses)
    }

    const set_account_names = (addresses, callback) => {
      console.log(`Deterministic Index: Setting Account Names`)
      addresses.forEach( (address, index) => {
        let account_name = base32.encode( address.deterministic_index.toString() ).replace(/=/g, "").toLowerCase()
        if(account_name.length > 12) { throw new Error(`${account_name} is greater than 12 characters`) }
        // else if (account_name.length == 12) { console.log(`${wallet.address}:${wallet.deterministic_index} is exactly 12 characters`) }
        else if (address.address == CS_ADDRESS_B1 ) { account_name = "b1" }
        else { account_name = account_name.padEnd(12, "genesis11111") }
        address.account_name = account_name
        addresses[index] = address
      })
      callback(null, addresses)
    }

    const update_addresses = (error, addresses) => {
      if(error) {
        throw new Error(error)
        return
      }
      console.log(`Deterministic Index: Updating Indices and Account Names to DB in batches`)
      console.log(`This is probably going to take a while.`)
      async.eachOfSeries(addresses, (address, key, next) => {
        let total_addresses = addresses.length
        if(cache_index!=0) cache += ', '
        cache += `("${address.address}",${address.deterministic_index},"${address.account_name}")`
        cache_index++
        if(cache_index>100 || key==total_addresses-1) {
          query.set_address_account_name(cache)
            .then( result => {
              cache = ""
              cache_index = 0
              next()
            })
            .catch(e => {throw new Error(e)})
        }
        else {
          next()
        }
      }, () => batch_complete() )
    }

    async.waterfall(
      [ get_addresses, set_deterministic_indices, set_account_names ],
      update_addresses
    )
  }

  const batch_complete = (_complete) => {
    if(_complete)
      complete(null, state)
    else
      batch_index++,
      batch(batch_complete)
  }

  batch(batch_complete)

}
