module.exports = ( state, complete ) => {

  const async     = require('async'),
        fs        = require('fs'),
        bn        = require('bignumber.js'),
        checksum  = require('checksum'),
        md5       = require('md5'),
        Sequelize = require('sequelize'),
        Op        = Sequelize.Op,
        db        = require('../../models'),
        util      = require('../../utilities'),
        query      = require('../../queries')

  let data = {
    version: "",
    parameters : {},
    accounts: {},
    supply: {},
    meta: {},
    checksum: {
      output: {},
      db: {}
    },
    stats: {}
  }

  const get_version = callback => {
    data.version = VERSION
    callback()
  }

  const get_state_variables = callback => {
    data.parameters = {
      period:                config.period,
      block_begin:           state.block_begin,
      block_end:             state.block_end
      // b1_dist:               config.include_b1
    }
    data.meta.author = config.author
    data.meta.timestamp_started = state.timestamp_started
    callback()
  }

  const get_accounts_total = callback => {
    db.Snapshot.count()
      .then( total => {
        data.accounts.valid = total
        callback()
      })
      .catch( error => { throw new Error(error) })
  }

  const get_supply_expected = callback => {
    data.supply.expected = 200000000+(config.period*2000000)+100000000
    callback()
  }

  const get_supply_included = callback => {
    db.Snapshot.sum('balance')
      .then( included => {
        data.supply.included = included
        data.supply.percent_included = `${data.supply.included/data.supply.expected*100 | 0}%`
        callback()
      })
      .catch( error => { throw new Error(error) })
  }

  const get_supply_liquid = callback => {
    query.supply_liquid()
      .then( sum => {
        data.supply.liquid = parseFloat(sum[0]['sum(balance_total)'])
        console.log(data.supply.liquid)
        data.supply.margin_of_error = `${new bn(100).minus(new bn(data.supply.liquid).div(new bn(data.supply.expected)).times(100)).toFixed(16)}%`
        callback()
      })
      .catch( error => { throw new Error(error) })
  }

  const get_supply_total = callback => {
    let query = `SELECT sum(balance_wallet) FROM wallets`
    db.sequelize
      .query(query, {type: db.sequelize.QueryTypes.SELECT})
      .then( sum => {
        data.supply.total = parseFloat(sum[0]['sum(balance_wallet)'])
        callback()
      })
      .catch( error => { throw new Error(error) })
  }

  const get_accounts_registered = callback => {
    query.count_accounts_registered()
      .then( count => {
        data.accounts.registered = count
        data.accounts.registered_included_percent = new String(data.accounts.registered/data.accounts.valid*100)+"%"
        callback()
      })
      .catch( error => { throw new Error(error) })
  }

  const get_accounts_fallback = (callback) => {
    db.Wallets
      .count({
        where: { fallback: true, valid: true }
      })
      .then( count => {
        data.accounts.fallback = count
        data.accounts.fallback_included_percent = new String(data.accounts.fallback/data.accounts.valid*100)+"%"
        callback()
      })
      .catch( error => { throw new Error(error) })
  }

  const get_snapshot_checksum = callback => {
    checksum.file(state.files.path_snapshot_csv , (err, sum) => {
      if(err)
        console.log(`file ${state.files.path_snapshot_csv} doesn't exist`)
      else
        data.checksum.output.snapshot = sum
      callback()
    })
  }

  const get_snapshot_unregistered_checksum = callback => {
    checksum.file(state.files.path_snapshot_unregistered_csv , (err, sum) => {
      if(err)
        console.log(`file ${state.files.path_snapshot_unregistered_csv} doesn't exist`)
      else
        data.checksum.output.snapshot_unregistered = sum
      callback()
    })
  }

  const get_distribution_checksum = callback => {
    checksum.file(state.files.path_distribution_csv , (err, sum) => {
      if(err)
        console.log(`file ${state.files.path_distribution_csv} doesn't exist`)
      else
        data.checksum.output.distribution = sum
      callback()
    })
  }

  const get_table_checksum = callback => {
    console.log(`Generating DB Table Checksums`)
    db.sequelize
      .query('CHECKSUM TABLE wallets, buys, claims, registrations, reclaimables, transfers, snapshot, public_keys')
      .then( results => {
        results[0].forEach( result => {
          let key = result.Table.split('.')[1]
          data.checksum.db[key] = checksum(result.Checksum.toString())
        })
        callback()
      })
  }

  const get_timestamp = callback => {
    data.meta.timestamp_completed = state.completed
    callback()
  }

  const get_time_elapsed = callback => {
    let prettyMs = require('pretty-ms');
    if(data.meta.timestamp_started && data.meta.timestamp_completed) data.meta.total_time = prettyMs( (data.meta.timestamp_completed-data.meta.timestamp_started)*1000 )
    callback()
  }

  const get_state_stats = callback => {
    data.stats.contract = state.sync_contract
    callback()
  }

  const output = callback => {
    fs.writeFile(state.files.path_snapshot_json, JSON.stringify(data, null, "\t"), (err) => {
      console.log("Snapshot meta written to snapshot.json");
      if(config.overwrite_snapshot) fs.createReadStream(state.files.path_snapshot_json).pipe(fs.createWriteStream(state.files.file_snapshot_json))
      callback()
    });
  }

  const get_config = callback => {
    //Clone object
    data.config = JSON.parse(JSON.stringify(config))

    //Delete potentially unsafe data from object before saving to file
    delete data.config.eth_node_type
    delete data.config.eth_node_path
    delete data.config.redis_host
    delete data.config.redis_port
    delete data.config.mysql_db
    delete data.config.mysql_user
    delete data.config.mysql_pass
    delete data.config.mysql_host
    delete data.config.mysql_port

    callback()
  }

  const get_block_range = callback => {
    data.block_range = {
      begin: state.block_begin,
      end: state.block_end
    }
    callback()
  }

  const get_dist_status = callback => {
    data.distribution_status = {
      crowdsale_over: state.crowdsale_over,
      tokens_frozen: state.frozen
    }
    if(data.distribution_status.tokens_frozen)
      data.distribution_status.tokens_freeze_block = state.freeze_block
    callback()
  }

  const get_public_key_count = callback => {
    db.Keys
      .count()
      .then( count => {
        data.public_keys = count
        callback()
      })
  }


  console.log('Generating snapshot.json')
  async.series([
    get_version,
    get_state_variables,
    get_accounts_total,
    get_accounts_registered,
    get_accounts_fallback,
    get_supply_total,
    get_supply_expected,
    get_supply_included,
    get_supply_liquid,
    get_snapshot_checksum,
    get_snapshot_unregistered_checksum,
    get_distribution_checksum,
    get_table_checksum,
    get_timestamp,
    get_time_elapsed,
    get_state_stats,
    get_config,
    get_block_range,
    get_dist_status,
    get_public_key_count,
    output,
  ], () => complete(null, state) )

}
