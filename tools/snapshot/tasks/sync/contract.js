module.exports = ( state, complete ) => {

  const db             = require('../../models'),
        Sequelize      = require('sequelize'),
        // db_config      = {ignoreDuplicates: true},
        db_config      = {}
        colors         = require('colors/safe'),
        Op             = Sequelize.Op,
        query          = require('../../queries'),
        sha256         = require('sha256'),
        series         = require('async').series,
        parallel       = require('async').parallel

  let   util           = require('../../utilities'),
        scanCollection = require('../../helpers/web3-collection'),
        bn             = require('bignumber.js'),
        Iterator       = require('../../classes/Iterator'),

        sync = {},
        log_intval,
        iterator,
        settings = {},
        resume_tries = 0

  // if(config.recalculate_wallets === true) {
  //   console.log('recalculate_wallets set to true, skipping contract sync')
  //   complete(null, state)
  //   return
  // }

  console.log(art("sync contract","2"))

  state.sync_contract = {
    buys:0,
    claims:0,
    reclaimables:0,
    registrations:0,
    transfers:0,
  }

  // let DEBUG_COLLISION

  const transfers = (settings, next) => {

    scanCollection.transfers( settings.begin, settings.end )
      .then( transfers => {
        if(transfers.length) {
          let request = transfers.map( transfer => {
            return {
              uuid:         generate_uuid(transfer),
              tx_hash:      transfer.transactionHash,
              block_number: transfer.blockNumber,
              from:         transfer.returnValues.from.toLowerCase(),
              to:           transfer.returnValues.to.toLowerCase(),
              eos_amount:   new bn(transfer.returnValues.value).toFixed()
            }
          })
          // DEBUG_COLLISION = transfers
          state.sync_contract.transfers+=request.length
          next(null, request)
        } else {
          next(null, [])
        }
      })
  }

  const buys = (settings, next) => {
    scanCollection.buys( settings.begin, settings.end )
      .then( buys => {
        if(buys.length) {
          let request = buys.map( buy => {
            return {
              uuid:         generate_uuid(buy),
              tx_hash:      buy.transactionHash,
              block_number: buy.blockNumber,
              address:      buy.returnValues.user.toLowerCase(),
              period:       buy.returnValues.window,
              eth_amount:   new bn(buy.returnValues.amount).toFixed()
            }
          })
          state.sync_contract.buys+=request.length
          next(null, request)
        } else {
          next(null, [])
        }
      })
      .catch( e => { throw new Error(e)} )
  }

  const claims = (settings, next) => {
    scanCollection.claims( settings.begin, settings.end )
      .then( claims => {
        if(claims.length) {
          let request = claims.map( claim => {
            return {
              uuid:         generate_uuid(claim),
              tx_hash:      claim.transactionHash,
              block_number: claim.blockNumber,
              address:      claim.returnValues.user.toLowerCase(),
              period:       claim.returnValues.window,
              eos_amount:   new bn(claim.returnValues.amount).toFixed()
            }
          })
          state.sync_contract.claims+=request.length
          next(null, request)
        } else {
          next(null, [])
        }
      })
      .catch( e => { throw new Error(e)} )
  }


  const registrations = (settings, next) => {
    scanCollection.registrations( settings.begin, settings.end )
      .then( registrations => {
        if(registrations.length) {
          let request = registrations.map( registration => {
            return {
              uuid:         generate_uuid(registration),
              tx_hash:      registration.transactionHash,
              position:     registration.transactionIndex,
              block_number: registration.blockNumber,
              address:      registration.returnValues.user.toLowerCase(),
              //encode because some of register function exploits ... fixes a different problem from the web3 fork problem
              eos_key:      util.misc.sanitize_user_input(registration.returnValues.key)
            }
          })
          state.sync_contract.registrations+=request.length
          next(null, request)
        } else {
          next(null, [])
        }
      })
      .catch( e => { throw new Error(e)} )
  }

  const reclaimables = (settings, next) => {
    scanCollection.reclaimables( settings.begin, settings.end )
      .then( reclaimables => {
        if(reclaimables.length) {
          let request = reclaimables.map( reclaimable => {
            let eos_amount = new bn(reclaimable.returnValues.value)
            return {
              uuid:         generate_uuid(reclaimable),
              tx_hash:      reclaimable.transactionHash,
              block_number: reclaimable.blockNumber,
              address:      reclaimable.returnValues.from.toLowerCase(),
              eos_amount:   eos_amount.toFixed()
            }
          })
          state.sync_contract.reclaimables+=request.length
          next(null, request)
        } else {
          next(null, [])
        }
      })
      .catch( e => { throw new Error(e)} )
  }

  const save_progress = (request, end, callback) => {

    const save_records = next => {
      series([
        next => { db.Transfers.bulkCreate( request.Transfers, db_config ).then( () => next() ).catch(e => { throw new Error(e)}) },
        next => { db.Buys.bulkCreate( request.Buys, db_config ).then( () => next() ).catch(e => {throw new Error(e)}) },
        next => { db.Claims.bulkCreate( request.Claims, db_config ).then( () => next() ).catch(e => {throw new Error(e)}) },
        next => { db.Registrations.bulkCreate( request.Registrations, db_config ).then( () => next() ).catch(e => {throw new Error(e)}) },
        next => { db.Reclaimables.bulkCreate( request.Reclaimables, db_config ).then( () => next() ).catch(e => {throw new Error(e)}) },
      ], () => next())
    }

    const save_current_state = next => {
      save_sync_progress( 'contracts_state', JSON.stringify(state.sync_contract), next )
    }

    const save_block_height = next => {
      save_sync_progress( 'contracts', end, next )
    }

    series([
      save_records,
      save_current_state,
      save_block_height
    ], callback )

  }

  const generate_uuid = (tx) => {
    return sha256(tx.transactionHash+tx.id+String(tx.transactionIndex))
  }

  const start_sync = (begin, end) => {
    sync_contract( begin, end, () => { complete( null, state ) })
  }

  const sync_contract = (begin, end, synced) => {
    console.log(`Syncing Contract State between block #${begin} & ${end}`)

    const _for = require('async-for')

    settings.per_iteration = 100
    settings.iterations = Math.ceil((end - begin)/settings.per_iteration)
    settings.offset = begin

    let loop = _for(0, function (i) { return i < settings.iterations }, function (i) { return i + 1; },
      function loopBody(i, _break, _continue) {
        settings.begin = (i*settings.per_iteration)+settings.offset
        settings.end = settings.begin+settings.per_iteration
        //If difference between begin and end can be perfectly divided by per_iterationshould
        //settings end should not subtract one because otherwise it will miss a block!
        if(settings.end != end) settings.end=settings.end-1
        if(settings.end > end) settings.end = end

        settings.index = i
        settings.total = settings.iterations


        // console.log(state.block_begin, state.block_end, begin, end, settings)

        parallel({
            Transfers     : next => transfers( settings, next ),
            Buys          : next => buys( settings, next ),
            Claims        : next => claims( settings, next ),
            Registrations : next => registrations( settings, next ),
            Reclaimables  : next => reclaimables( settings, next )
        }, (error, result) => {
          if(error)
            throw new Error(error)
          else
            save_progress( result, settings.end, () => {
              _continue()
            })
        })
      });

    loop(() => {
      clearInterval(log_intval)
      log('green', true)
      console.log(colors.green('Contract Syncing Complete'))
      setTimeout(synced, 5000)
    })

    // console.log(`Syncing Contracts between block #${state.block_begin} and #${state.block_end}, this may take a while.`)
    log_periodically()
  }

  const save_sync_progress = ( type, value, callback ) => {
    // console.log(`Syncing progress for ${type} to block ${value}`)
    db.State
      .upsert({ meta_key: `sync_progress_${type}`, meta_value: value })
      .then( () => callback() )
  }

  const prepare_resume = ( block, callback ) => {
    const destroy_above_block = require('../../queries').destroy_above_block
    destroy_above_block(block, () => {
      console.log(`destroyed records above resume block #${block}`)
      callback()
    })
  }

  const format_verification_query = callback => {
    let stats = {}
    parallel([
      (next) => { query.count_buys().then( r => { stats.buys = r, next() }).catch(e => {throw new Error(e)}) },
      (next) => { query.count_claims().then( r => { stats.claims = r, next() }).catch(e => {throw new Error(e)}) },
      (next) => { query.count_registrations().then( r => { stats.registrations = r, next() }).catch(e => {throw new Error(e)}) },
      (next) => { query.count_transfers().then( r => { stats.transfers = r, next() }).catch(e => {throw new Error(e)}) },
      (next) => { query.count_reclaimables().then( r => { stats.reclaimables = r, next() }).catch(e => {throw new Error(e)}) }
    ], (error, results) => {
      ordered = {}
      Object.keys(stats).sort().forEach(function(key) {
        ordered[key] = stats[key];
      });
      callback( JSON.stringify(ordered) )
    })
  }

  const verify_resume = (resume_block, callback)  => {
    format_verification_query( counted_from_db => {
      db.State
        .findAll({
           attributes: ['meta_value'],
           where: {meta_key: "sync_progress_contracts_state"}
         })
        .then( results => {
          if(results.length) {
            let saved_state = results[0].dataValues.meta_value
            let saved_state_ordered = {}
            Object.keys(JSON.parse(saved_state)).sort().forEach(function(key) {
              saved_state_ordered[key] = JSON.parse(saved_state)[key]
            });
            if( saved_state != counted_from_db )
              console.log(JSON.stringify(saved_state_ordered), counted_from_db),
              console.log("Something isn't right, you will have to resync contracts, remove 'resume' from configuration"),
              process.exit()
            else
              console.log(JSON.stringify(saved_state_ordered), counted_from_db),
              console.log("Resume verified."),
              state.sync_contract = saved_state_ordered
              callback()
            } else {
              callback()
            }
        })
        .catch(e => {throw new Error(e)})
    })
  }

  const run_resume = (resume_block) => {
    // prepare_resume( resume_block, () => {
      verify_resume( resume_block, () => {
        console.log("original start block:", state.block_start, "resume block saved:", resume_block-1, "resume block now:", resume_block)
        start_sync( resume_block, state.block_end )
      })
    // })
  }

  const maybe_resume = () => {
    db.State
     .findAll({
        attributes: ['meta_value'],
        where: {meta_key: "sync_progress_contracts"}
      })
      .then( results => {
        let resume_block
        if(results.length) {
          resume_block = parseInt(results[0].dataValues.meta_value)+1
          console.log(`Contracts previously synced up to block ${resume_block-1}, resuming from ${resume_block}`)
        } else {
          resume_block = state.block_begin
        }

        if(resume_block >= state.block_end) {
          console.log(`Looks like contracts are already synced to or above block number ${resume_block}, jumping to wallets.`)
          setTimeout(() => complete(null, state), 5000)
          return
        }

        run_resume(resume_block)

      })
      .catch(e => {throw new Error(e)})
  }

  const cleanString = input => {
    let output = "";
    for (var i=0; i<input.length; i++) {
      if (input.charCodeAt(i) <= 127) {
        output += input.charAt(i);
      }
    }
    return output;
  }

  const log_periodically = () => {
    log_intval = setInterval( () => log('gray'), 10*1000 )
  }

  const log = (color, complete) => {
    const Table  = require('ascii-table')

    let   table

    if(complete)
      table = new Table(`100%: ${state.block_begin} ~> ${state.block_end}`)
    else
      table = new Table(`${Math.floor(settings.index/settings.total*100)}%: ${settings.begin}~>${settings.end}`)

    table.addRow('Transfers', state.sync_contract.transfers)
    table.addRow('Buys', state.sync_contract.buys)
    table.addRow('Claims', state.sync_contract.claims)
    table.addRow('Registrations', state.sync_contract.registrations)
    table.addRow('Reclaimables', state.sync_contract.reclaimables)
    console.log(colors[color](table.setAlign(0, Table.RIGHT).setAlign(1, Table.LEFT).render()))
  }

  if(config.resume) {
    maybe_resume()
  } else {
    start_sync(state.block_begin, state.block_end)
  }

}
