const Sequelize    = require('sequelize'),
      Op           = Sequelize.Op,
      async        = require('async'),
      bn           = require('bignumber.js'),
      db           = require('./models')

      query = {}

//Accepts array of wallets, wallet.json() method provides appropriate response.
query.wallets_bulk_upsert = ( wallets ) => {
  return db.Wallets.bulkCreate( wallets, { updateOnDuplicate: true })
}

//Returns an array of unique addresses in the database based on a block range and period range for buys (necessary for wallet resume)
query.address_uniques = ( block_begin, block_end, period_begin, period_end, callback ) => {
  let query = `SELECT \`from\` as address FROM transfers WHERE block_number>=${block_begin} AND block_number<=${block_end}
                UNION DISTINCT SELECT \`to\` as address FROM transfers WHERE block_number>=${block_begin} AND block_number<=${block_end}
                UNION DISTINCT SELECT address as address FROM claims WHERE block_number>=${block_begin} AND block_number<=${block_end}
                UNION DISTINCT SELECT address as address FROM buys WHERE period>=${period_begin} AND period<=${period_end}
                UNION DISTINCT SELECT address as address FROM registrations WHERE block_number>=${block_begin} AND block_number<=${block_end}`
  db.sequelize
    .query(query, {type: db.sequelize.QueryTypes.SELECT})
    .then( results => {
      addresses = results.map( result => result.address || result.from || result.to  )
      callback( addresses )
    })
}

//Returns an array of addresses and deterministic indices (used for conversion to deterministic byte32 account_names)
query.address_deterministic_indices = ( callback ) => {
  db.Wallets
    .findAll({
      attributes: ['address', 'deterministic_index'],
      order: [['deterministic_index', 'ASC']],
    }, {type: db.sequelize.QueryTypes.SELECT})
    .then( results => {
      callback( results )
    })
}

//Returns a user's last registration (must be used for determinism, the register function still works after token freeze, so public constant cannot be used)
query.last_register = (address, begin, end, callback) => {
  db.Registrations
    .findAll({
      attributes: ['eos_key'],
      where: {
        address: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      },
      order: [
        ['block_number', 'DESC'],
        ['position', 'DESC']
      ],
      limit: 1
    })
    .then( results => callback( results.length ? results[0].dataValues.eos_key : null ) )
}

// Returns a promise with an addresses' claims within a defined block range
query.address_claims = (address, begin, end, period) => {
  return db.Claims
    .findAll({
      where : {
        address: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          },
          {
            period: {
              [Op.lte] : period
            }
          }
        ]
      }
    })
}

// Returns a promise with an addresses' buys within a defined block range
query.address_buys = (address, begin, end, period) => {
  return db.Buys
    .findAll({
      where : {
        address: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          },
          {
            period: {
              [Op.lte] : period
            }
          }
        ]
      }
    })
}

// Returns a promise with an addresses' incoming txs within a defined block range
query.address_transfers_in = (address, begin, end) => {
  return db.Transfers
    .findAll({
      attributes: ['eos_amount'],
      where: {
        to: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    }, {type: db.sequelize.QueryTypes.SELECT})
}

// Returns a promise with an addresses' outgoing txs within a defined block range
query.address_transfers_out = (address, begin, end) => {
  return db.Transfers
    .findAll({
      attributes: ['eos_amount'],
      where: {
        from: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    }, {type: db.sequelize.QueryTypes.SELECT})
}

query.address_reclaimables = (address, begin, end) => {
  return db.Reclaimables
    .findAll({
      attributes: ['eos_amount'],
      where: {
        address: address,
        [Op.and] : [
          {
            block_number: {
              [Op.gte] : begin
            }
          },
          {
            block_number: {
              [Op.lte] : end
            }
          }
        ]
      }
    })
}

//DEPRECATED: No longer needed because transfers have a hash as UUID that is probablistically unique
//Destroys contract logs above a block height
query.destroy_above_block = (block_number, callback) => {
  //The block number passed here is the block that will be included in the range
  //so we want to delete everything greater than OR equal to that block (edge case: contract sync interrupt)
  async.series([
    next => db.Buys.destroy({ where : { block_number: { [Op.gte] : block_number } } }).then(next),
    next => db.Claims.destroy({ where : { block_number: { [Op.gte]: block_number } } }).then(next),
    next => db.Transfers.destroy({ where : { block_number: { [Op.gte] : block_number } } }).then(next),
    next => db.Registrations.destroy({ where : { block_number: { [Op.gte] : block_number } } }).then(next),
    next => db.Reclaimables.destroy({ where : { block_number: { [Op.gte] : block_number } } }).then(next)
  ], () => {
    callback()
  })
}

//Returns liquid supply
query.supply_liquid = () => {
  let query = `SELECT sum(balance_total) FROM wallets WHERE address!="${CS_ADDRESS_TOKEN}" AND address!="${CS_ADDRESS_CROWDSALE}"`
  // if(!config.include_b1)
    // query = `${query} AND address!="${CS_ADDRESS_B1}"`
  return db.sequelize.query(query, {type: db.sequelize.QueryTypes.SELECT})
}

//Returns promise with count of registered accounts
query.count_accounts_registered = () => {
  return db.Wallets
    .count({
      where: { registered: true, valid: true  }
    })
}

//Deprecated
query.sync_progress_destroy = () => {
  return db.State.destroy({
    where: {
      [Op.or] : [
        {meta_key: "sync_progress_buys"},
        {meta_key: "sync_progress_claims"},
        {meta_key: "sync_progress_registrations"},
        {meta_key: "sync_progress_transfers"},
        {meta_key: "sync_progress_reclaimables"}
      ]
    }
  })
}

//Returns promise with count of transfers
query.count_transfers = () => {
  return db.Transfers.count()
}

//Returns promise with count of buys
query.count_buys = () => {
  return db.Buys.count()
}

//Returns promise with count of claims
query.count_claims = () => {
  return db.Claims.count()
}

//Returns promise with count of registrations
query.count_registrations = () => {
  return db.Registrations.count()
}

//Returns promise with count of reclaimables
query.count_reclaimables = () => {
  return db.Reclaimables.count()
}

//Returns promise with addresses that are unregistered but have a balance_total above the configured minimum balance
query.get_unregistered_users_sufficient_balance = () => {
  let query = `SELECT address FROM wallets WHERE valid=false AND balance_total>=${config.snapshot_minimum_balance}`
  return db.sequelize.query(query, {type: db.sequelize.QueryTypes.SELECT})
}

//Sets deterministic indices with a cross join based on rownumber after ordering ASC on first_seen and then address
query.set_deterministic_indices = () => {
  query = `UPDATE wallets AS target JOIN
  (
       SELECT address, first_seen, (@rownumber := @rownumber + 1) AS rownum
       FROM wallets
       CROSS JOIN (select @rownumber := 0) r
       ORDER BY first_seen, address
  ) source ON target.address = source.address
  SET deterministic_index = rownum`
  return db.sequelize.query(query)
}

//Returns a promise with the lowest block number for an address, used for deterministic index.
query.address_first_seen = address => {
  const query = `SELECT bn.block_number from (
  	(SELECT tf.block_number FROM transfers AS tf WHERE \`from\`="${address}")
  	UNION
  	(SELECT tt.block_number FROM transfers AS tt WHERE \`to\`="${address}")
  	UNION
  	(SELECT b.block_number FROM buys AS b WHERE address="${address}")
  	UNION
  	(SELECT c.block_number FROM claims AS c WHERE address="${address}")
  	UNION
  	(SELECT r.block_number FROM registrations AS r WHERE address="${address}")
    ) AS bn ORDER BY bn.block_number ASC LIMIT 1`
  return db.sequelize.query(query, {type: db.sequelize.QueryTypes.SELECT})
}

//Returns promise with cumulative balance for an address within a block range, required for deterministic ongoing snapshots.
query.address_sum_transfer_balance = (address, block_from, block_to) => {
  const query = `SELECT sum(wallet) FROM (
  (
    SELECT SUM(_ti.eos_amount) AS wallet
    FROM transfers AS _ti
    WHERE \`to\`="${address}"
    AND block_number<=${block_to}
    AND block_number>=${block_from}
  )
  UNION
  (
    SELECT (SUM(_to.eos_amount)*-1) AS wallet
    FROM transfers AS _to
    WHERE \`from\`="${address}"
    AND block_number<=${block_to}
    AND block_number>=${block_from}
  )) AS wallet`
  return db.sequelize.query(query, {type: db.sequelize.QueryTypes.SELECT})
}

query.set_address_account_name = values => {
  return db.sequelize.query(`INSERT into wallets (address, deterministic_index, account_name) VALUES ${values} ON DUPLICATE KEY UPDATE deterministic_index=VALUES(deterministic_index), account_name=VALUES(account_name)`)
}

module.exports = query
