module.exports = ( state, complete ) => {

  // if(!config.registration_fallback) {
  //   console.log("Skipping fallback registration")
  //   complete(null, state)
  //   return
  // }

  const async     = require('async'),
        Table     = require('ascii-table'),

        db        = require('../../models'),
        Sequelize = require('sequelize'),
        Op        = Sequelize.Op,
        util      = require('../../utilities'),
        query     = require('../../queries')

  let   intval,
        pks_found   = 0,
        count       = 0,
        total       = 0

  const run = () => {
    async.waterfall([
        get_uniques,
        process_uniques
      ],
      () => setTimeout( () => complete(null, state), 5000 )
    )
  }

  const get_uniques = ( next ) => {
    query.get_unregistered_users_sufficient_balance()
      .then( (results) => {
        total = results.length
        results = results.map( result => { return result.address } )
        next( null, results )
      })
      .catch(e => { throw new Error(e) })
  }

  const process_uniques = ( addresses, next ) => {
    periodic_log()
    async.eachSeries( addresses, (address, next_address) => {
      fallback( address, (error, eos_key) => {
        if(error || !eos_key)
          error = ( error=="undefined" || typeof error === "undefined") ? "unknown" : error,
          db.Wallets
            .update(
              { fallback_error: error },
              { where : { address: address } }
            )
            .then( () => next_address() )
            .catch( e => {throw new Error(e)})
        else
          db.Wallets
            .update(
              {
                eos_key: eos_key,
                fallback: true,
                fallback_error: null,
                valid: true
              },
              { where : { address: address } }
            )
            .then( () => {
              // redis.del(address);
              pks_found++
              next_address()
            })
            .catch( e => {throw new Error(e)})
      })
      count++
    },
    (err, result) => {
      clearInterval( intval )
      log()
      next()
    })
  }

  const fallback = (address, callback) => {
    async.waterfall([
      next => next( null, address ),
      check_address_contract,
      pub_key_from_cache,
      eos_key_from_pk
    ],
    (error, eos_key) => {
      if(error)
        callback(error)
      else {
        callback(null, eos_key)
      }
    })
  }

  const check_address_contract = (address, callback) => {
    util.misc.address_is_contract( address, is_contract => {
      if(is_contract)
        callback("address_is_contract") //error
      else {
        callback(null, address) //continue
      }
    })
  }

  const pub_key_from_cache = (address, callback) => {
    db.Keys
      .findAll({
        where: {
          address: address,
          [Op.and] : [
            {
              block_number: {
                [Op.gte] : state.block_begin
              }
            },
            {
              block_number: {
                [Op.lte] : state.block_end
              }
            }
          ]
        },
        attributes: ['public_key']
      }, {type: db.sequelize.QueryTypes.SELECT})
      .then( results => {
        if(results.length)
          callback(null, results[0].dataValues.public_key)
        else
          callback(`no_public_key`)
      })
      .catch( e => {throw new Error(e)})
  }

  const eos_key_from_pk = ( pubkey, callback ) => {
      let eos_key = util.misc.convert_ethpk_to_eospk(pubkey)
      if(util.misc.is_eos_public_key(eos_key))
        callback(null, eos_key)
      else
        callback('converted_key_invalid')
  }

  const log = (addresses) => {
    let table = new Table(`Fallback Registration`),
        success_rate = Math.floor(pks_found/total*100)

    table.addRow('Progress', `${Math.floor(count/total*100)}%`)
    table.addRow('PKs Found', pks_found)
    table.addRow('Pks Unfound', total-pks_found)
    table.addRow('Found Rate', `${success_rate}%`)
    table.addRow('Addresses Processed', count)
    console.log( table.setAlign(0, Table.RIGHT).setAlign(1, Table.LEFT).render() )
  }

  const periodic_log = () => {
    intval = setInterval( log, 10000 )
  }

  run()
}

//
// const pub_key_from_tx_hash = ( tx_hash, callback ) => {
//   util.misc.pubkey_from_tx_hash(tx_hash, pubkey => {
//     if(pubkey)
//       callback(null, pubkey)
//     else
//       callback('pub_key_not_found')
//   })
// }
