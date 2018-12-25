module.exports = (state, complete) => {

  const Table         = require('ascii-table'),
        async         = require('async'),
        bn            = require('bignumber.js'),

        db            = require('../../models'),
        util          = require('../../utilities'),
        query         = require('../../queries'),
        Wallet        = ( typeof state.mode != 'undefined' && state.mode == 'final' && state.frozen == true
                          ? require('../../classes/Wallet.Final')
                          : require('../../classes/Wallet.Ongoing') )


        /**
        * Current wallet index.
        */
  let   index         = 0,

        /**
        * Wallets to be bulk upserted
        */
        cache         = [],

        /**
        * Holds unique addresses to be processed
        */
        table,

        /**
        * Holds unique addresses to be processed
        */
        uniques,

        /**
        * Holds resume period if any for entire scope
        */
        resume_period = -1,

        /**
        * In case of resume, block range is adjusted in this scope only, otherwise state block range is inherited.
        */
        block_begin,
        block_end

  console.log(art("calculate","2"))

  /**
  * Instantiates the wallet and passes into the control flow.
  * @param {object} wallet Cumulative object passed through waterfall control_flow
  * @param {function} finished Waterfall control_flow callback, passes (error, subject), subject is passed to next function in control flow
  */
  const init = (address, finished) => {
    let wallet = new Wallet( address, config )
    finished( null, wallet )
  }

  /**
  * Queries the most recent register within the block range and saves it to wallet. This is required for determinism, "keys" constant function cannot be used here.
  * @param {object} wallet Cumulative object passed through waterfall control_flow
  * @param {function} finished Waterfall control_flow callback, passes (error, subject), subject is passed to next function in control flow
  */
  const key = (wallet, finished) => {
    if(state.mode == "final")  {
      //use EOSCrowdsale.keys()
      finished( null, wallet )
      return
    }
    query.last_register(wallet.address, state.block_begin, state.block_end, eos_key => {
      wallet.eos_key = eos_key
      finished( null, wallet )
    })
  }

  /**
  * If mode is ongoing, queries incoming/outgoing transfers separately, and saves them to wallet for later processing by utility.balance.transfersCumulative
  * @param {object} wallet Cumulative object passed through waterfall control_flow
  * @param {function} finished Waterfall control_flow callback, passes (error, subject), subject is passed to next function in control flow
  */
  const transfers = (wallet, finished) => {
    //Cumulative balance calculations are not required for final snapshot because tokens will be frozen, final snapshot uses tokenContract.balanceOf()
    if( typeof state.mode !== 'undefined' && state.mode == 'final' && state.frozen ) {
      finished(null, wallet)
      return
    }

    //By default use MySQL unless something goes awfully wrong. Their output is the same, but MySQL is faster.
    if(config.use_js_cumulative) {
      wallet.transfers = []

      const add = next => {

        //Required for accurate contract wallet balance.
        if(wallet.address.toLowerCase() == CS_ADDRESS_CROWDSALE.toLowerCase())
          wallet.transfers.push(CS_TOTAL_SUPPLY)

        query.address_transfers_in(wallet.address, state.block_begin, state.block_end)
          .then( results => {
            results = results.map( result => new bn(result.dataValues.eos_amount) )
            wallet.transfers = wallet.transfers.concat(results)
            next()
          })
      }

      const subtract = next => {
        query.address_transfers_out(wallet.address, state.block_begin, state.block_end)
          .then( results => {
            results = results.map( result => new bn(result.dataValues.eos_amount).times(-1) )
            wallet.transfers = wallet.transfers.concat(results)
            next()
          })
      }

      async.series([
        add,
        subtract
      ], () => { finished( null, wallet ) })
    }
    else {
      //query will sum all the user's incoming and outgoing(*-1) transfers within a block range, add initial supply to contract (not on chain)
      query.address_sum_transfer_balance(wallet.address, state.block_begin, state.block_end)
        .then( balance => {
          let balance_wallet = new bn(0)
          if(balance[0]['sum(wallet)'] != null) {
            balance_wallet = new bn(balance[0]['sum(wallet)'])
            //Add balance is used to add the initial supply for EOSCrowdsale contract to it's wallet, this isn't a transaction, so needs to be added manually.
            if(wallet.address == CS_ADDRESS_CROWDSALE)
              balance_wallet = balance_wallet.plus(CS_TOTAL_SUPPLY)
          }
          wallet.transfers = balance_wallet
          finished( null, wallet )
        })
        .catch(e => { console.log(wallet.address); throw new Error(e)})
    }
  }

  /**
  * Queries claims where true to an array filled with "false" by period.
  * @param {object} wallet Cumulative object passed through waterfall control_flow
  * @param {function} finished Waterfall control_flow callback, passes (error, subject), subject is passed to next function in control flow
  */
  const claims = (wallet, finished) => {
    // console.log('Wallet Claims')
    query.address_claims(wallet.address, state.block_begin, state.block_end, config.period)
      .then( results => {
        wallet.claims = new Array( CS_NUMBER_OF_PERIODS ).fill( false )
        results.forEach( result => {
          wallet.claims[ result.dataValues.period ] = true
        })
        finished( null, wallet )
      })
  }

  /**
  * Queries buys belonging to address, cumulative sums multiple reclaimables belonging to a single address and maps them in a format consumable by utility.balance.unclaimed
  * @param {object} wallet Cumulative object passed through waterfall control_flow
  * @param {function} finished Waterfall control_flow callback, passes (error, subject), subject is passed to next function in control flow
  */
  const buys = ( wallet, finished ) => {
    query.address_buys(wallet.address, state.block_begin, state.block_end, config.period)
      .then( results => {
        wallet.buys = new Array( CS_NUMBER_OF_PERIODS ).fill( new bn(0) )
        results.forEach( result => {
          wallet.buys[ result.dataValues.period ] = wallet.buys[ result.dataValues.period ].plus( new bn(result.dataValues.eth_amount) )
        })
        finished( null, wallet )
      })
  }

  /**
  * Queries reclaimables belonging to address, and maps them in a format consumable by utility.balance.reclaimables
  * @param {object} wallet Cumulative object passed through waterfall control_flow
  * @param {function} finished Waterfall control_flow callback, passes (error, subject), subject is passed to next function in control flow
  */
  const reclaimables = ( wallet, finished ) => {
    query.address_reclaimables( wallet.address, state.block_begin, state.block_end )
      .then( results  => {
        if( results.length ) {
          wallet.reclaimables = results.map( reclaim => { return { address: wallet.address, value: reclaim.dataValues.eos_amount } } )
        }
        finished( null, wallet )
      })
  }

  /**
  * Invokes query to find first block seen, used for deterministic index, and saves lowest block to wallet object as first_seen
  * @param {object} wallet Cumulative object passed through waterfall control_flow
  * @param {function} finished Waterfall control_flow callback, passes (error, subject), subject is passed to next function in control flow
  */
  const first_seen = ( wallet, finished ) => {
    query.address_first_seen( wallet.address )
      .then( results => {
        wallet.first_seen = results[0].block_number,
        finished(null, wallet)
      })
      .catch(e => {throw new Error(e)})
  }

  /**
  * Checks query cache for bulkCreate and invokes bulk upsert if conditional is true, invoking control_flow callback onComplete or invokes control_flow callback
  * @param {object} wallet Cumulative object passed through waterfall control_flow
  * @param {function} finished Waterfall control_flow callback, passes (error, subject), subject is passed to next function in control flow
  */
  const processing = ( wallet, finished ) => {
    wallet.process( json => {
      log_table_row( wallet )
      cache.push( json )
      finished( null, wallet )
    })
  }

  /**
  * Checks query cache for bulkCreate and invokes bulk upsert if conditional is true, invoking control_flow callback onComplete or invokes control_flow callback
  * @param {function} next_address eachSeries control_flow callback
  * @param {function} is_complete Override used to force upsert the cache.
  */
  const save_or_continue = (next_address, is_complete = false) => {
    if(cache.length >= 50 || is_complete || cache.length == state.total )
      query.wallets_bulk_upsert( cache )
        .then( () => { index++, reset_cache(next_address) } )
        .catch( e => { throw new Error(e) } )
    else
      next_address()
  }

  /**
  * Resets query cache used for bulkCreate, invokes table render/reset and invokes control_flow callback.
  * @param {function} next_address eachSeries control_flow callback
  */
  const reset_cache = ( next_address ) => {
    cache = new Array()
    log_table_render_and_reset()
    next_address()
  }

  const run = () => {

    /**
    * Queries state table for previously synced period value.
    * @param {function} next Proceed to next step in control flow
    */
    const check_resume = next => {
      if(!config.resume || config.recalculate_wallets) {
        next()
        return
      }
      db.State
       .findAll({
          attributes: ['meta_value'],
          where: { meta_key: `sync_wallets_period` }
        })
        .then(resume_from => {
          if(resume_from && resume_from.length) {
            let _resume_from = parseInt(resume_from[0].dataValues.meta_value)
            if(_resume_from <= config.period) {
              resume_period = _resume_from,
              console.log(`Resuming from Period ${_resume_from} up to ${config.period}`)
            }
            else {
              console.log(`Configured period is lower than last ran period, ${config.period}<${_resume_from}, this requires Wallets Table Truncation`)
            }
          }
          else {
            console.log(`Starting at Period 0 up to ${config.period}`)
          }
          next()
        })
        .catch( e => { throw new Error(e) })
    }

    /**
    * Sets block range if config.resume is true and previously found resume_period is greater than the configured period. If no rusume, or configured period is less than resume_period than truncate wallets table.
    * @param {function} next Proceed to next step in control flow
    */
    const handle_resume = next => {
      if(resume_period == config.period && !config.recalculate_wallets) {
        console.log(`Wallets already calculated for Period #${resume_period}, if you would like to recalculate, run script with --recalculate_wallets parameter`)
        complete(null, state)
      }
      else if(config.resume && resume_period>-1 && resume_period < config.period && !config.recalculate_wallets) {
        //Only query addresses with activity since last recorded sync.
        //If period x was synced previously, and period z is being synced now, then from the first block of period x+1=y (period[y].begin)
        // block_begin = state.period_map[resume_period+1].begin //this results in supply loss >_<
        block_begin = state.period_map[resume_period].begin
        //to the end of period z (previously defined in block range.)
        block_end = state.block_end
        next()
      }
      else {
        //Truncate wallets table
        console.log(`Truncating Wallets Table in 30 seconds`)
        setTimeout( () => {
          //Reset resume period to 0.
          resume_period = 0
          db.State.destroy({ where: {meta_key: "sync_wallets_period"} })
            .then( () => {
              db.Wallets
                .destroy({ truncate : true, cascade: false })
                .then(() => {
                  block_begin = state.block_begin
                  block_end = state.block_end
                  setTimeout( () => next(), 5000 )
                })
                .catch( e => { throw new Error(e) })
            })
            .catch( e => { throw new Error(e) })
        }, 30000)
      }
    }

    /**
    * Queries unique addresses for (potentially modified in case of resume) block range and period range for buys (future buys are possible). Loops through the unique addresses and processes each one.
    * @param {function} next Proceed to next step in control flow
    */
    const process_addresses = next => {
      query.address_uniques( block_begin, block_end, resume_period, config.period, _uniques => {
        uniques     = new Set(_uniques)
        state.total = uniques.size

        console.log(`Wallets: Found ${state.total} Unique Addresses based on Parameters`)

        log_table_reset()

        //Loop through every queried address and upsert that wallet's row.
        async.eachSeries( Array.from(uniques), (address, next_address) => {
          async.waterfall([
            (next)         => init(address, next),
            (wallet, next) => key(wallet, next),
            (wallet, next) => buys(wallet, next),
            (wallet, next) => claims(wallet, next),
            (wallet, next) => transfers(wallet, next),
            (wallet, next) => reclaimables(wallet, next),
            (wallet, next) => first_seen(wallet, next),
            (wallet, next) => processing(wallet, next)
          ],
          (error, wallet) => save_or_continue(next_address))
        },
        (err, result) => {
          save_or_continue( () => {
            db.State
              .upsert({ meta_key: `sync_wallets_period`, meta_value: config.period })
              .then( () => {
                next()
              })
              .catch( e => {throw new Error(e)})
          }, true )
        })
      })
    }
    async.series([
      check_resume,
      handle_resume,
      process_addresses
    ], () => {
      complete( null, state )
    })
  }

  /**
  * Renders table and invokes table reset
  */
  const log_table_render_and_reset = () => {
    console.log(table.render())
    log_table_reset()
  }

  /**
  * Resets the log table and sets the heading for next table.
  */
  const log_table_reset = () => {
    table = new Table(`${Math.round(index*50/uniques.size*100)}% [${index*50}/${uniques.size}] `)
    table.setHeading('V', 'R', 'ETH', 'EOS', 'In Wallet', 'Unclaimed', 'Reclaimed', 'Total', 'Reg. Error', 'First Seen')
  }

  /**
  * Logs the table row
  */
  const log_table_row = (wallet) => {
    table.addRow(
      (wallet.accepted ? `✓` : ` `),
      (wallet.registered ? `✓` : ` `),
      wallet.address,
      wallet.eos_key,
      `${wallet.balance.wallet} EOS`,
      `${wallet.balance.unclaimed} EOS`,
      `${wallet.balance.reclaimed} EOS`,
      `${wallet.balance.total} EOS`,
      `${wallet.register_error ? wallet.register_error : ""}`,
      `${wallet.first_seen ? wallet.first_seen : ""}`
    )
  }

  /**
  * Instantiate processing.
  */
  run()

}
