// global.Promise=require("bluebird")
require('./lib/globals')

module.exports = (COMPLETE) => {
  const Table = require('ascii-table'),
        colors = require("colors/safe"),
        waterfall = require('async').waterfall,
        async = require('async'),
        fs = require('fs'),
        period  = require('./utilities/periods')

  let IS_SETUP = false

  const run_snapshot = () => {
    let   state = {}

          //Some meta for later.
          state.timestamp_started = (Date.now() / 1000 | 0)

    waterfall([
      //Start waterfall with default state
      next => next(null, state),
      //Connect to mysql and web3 before starting
      (state, next) => {
        if(!IS_SETUP) {
          const connections = require('./tasks/misc/connections')
          connections(state, () => {
            IS_SETUP = true
            next(null, state)
          })
        } else {
          next(null, state)
        }
      },
      //Misc: Async globals
      require('./tasks/misc/preload'),
      //Sync: Set the period map
      require('./tasks/sync/periods'),
      //Misc: Check if the crowdsale is ongoing and the token is stopped, "frozen"
      require('./tasks/process/distribution-status'),
      //Process: Set the block range of the snapshot.
      require('./tasks/process/block-range'),
      //Misc: truncate all databases (except state) if config permits
      require('./tasks/misc/truncate-db'),
      //Sync: millions of ethereum public keys >_< (slow af but faster than the other one)
      require('./tasks/sync/public_keys'),
      //Sync: events from the crowdsale contract
      require('./tasks/sync/contract'),
      (state, next) => {
        if(config.only_produce_final_snapshot && !state.frozen) {
          console.log("only_produce_final_snapshot is set to true, skipping wallet calculations and snapshot export.")
          return next(null, state)
        }
        waterfall([
          next => next(null, state),
          //Process: Calculate and validate each wallet.
          require('./tasks/process/wallets'),
          //Process: Fallback Registration
          require('./tasks/process/fallback-registration.js'),
          //Process: Deterministic Index and account names
          require('./tasks/process/deterministic-index-account-names'),
          //Misc: Run tests against data to spot any issues with integrity
          require('./tasks/misc/tests'),
          //Generate output files.
          require('./tasks/export')
        ], (error, state) => {
          if(error)
            throw new Error(error)
          else
            next(null, state)
        })
      }
    ], snapshot_complete )}

  const snapshot_complete = (error, state) => {
    if(error) {
      console.log(art("try again","2"))
      console.log("Try with recalculate wallets, if that doesn't work remove --resume")
      throw new Error(error)
    }
    else {
      if(state.mode == "final") {
        console.log(art("final snapshot complete","2"))
        process.exit()
        return
      }
      else {
        console.log(art("complete","2"))
        console.log(`Snapshot for Period #${config.period} Completed.`)
      }
    }

    // const sync_progress_destroy = require('./queries').sync_progress_destroy
    if(typeof COMPLETE === 'function') {
      COMPLETE()
    }
    else if(config.poll) {
      global.config.period++
      console.log(`Running period ${config.period} in 10 seconds`)
      setTimeout( () => {
        check_for_poll()
      }, 10000)
    }
    else {
      console.log(`Exiting in 10 seconds.`)
      setTimeout( () => process.exit(), 10*1000 )
    }
  }

  const check_for_poll = (state) => {
    // console.log("Should poll?", config.period, period.last_closed())
    if(config.period <= period.last_closed()) {
      run_snapshot(state)
    }
    //In polling, the config.period is autoincremented before check_for_poll() is called,
    //so if it's greater than the highest period index (350) and the last closed period eq highest period index
    //Check if the token is frozen before attempting to generate final snapshot (tasks/block_range.js will force run the final snapshot.)
    else if(period.last_closed() == CS_MAX_PERIOD_INDEX) {
      contract = require('./helpers/web3-contract.js')
      contract.$token.methods.stopped().call()
        .then( stopped => {
          if(stopped) {
            console.log("Tokens frozen, running final snapshot.")
            run_snapshot(state)
          } else {
            console.log("Tokens aren't frozen yet, trying again in 10 seconds")
            setTimeout( () => check_for_poll(state), 10000 )
          }
        })
    }
    else {
      console.log("New period not yet discovered, trying again in 10 seconds")
      setTimeout( () => check_for_poll(state), 10000 )
    }
  }

  const configure = (callback) => {

    console.log(art("configuration","2"))

    //Show prompt?
    const show_prompt = next => {
      prompt = require('./prompt')
      prompt.start()
      prompt.get( prompt.schema, (error, config) => {
        if(error)
          throw new Error(error)
        else
          next(null, config)
      })
    }

    //Load and validate config.
    const load_config = (config, next) => {
      if(config.load_config) {
        try { config = require('../../config') }
        catch(e) {
          console.log("It appears you've set load_config somehow without having a config file you rascal. Duplicate the default config file and edit or set to false.")
        }
      }
      config = Object.assign( require('../../config.default'), config )
      next(null, config)
    }

    const override_config_with_params = ( config, next ) => {
      const optimist = require('optimist')
            inspect = require('util').inspect
      config = Object.assign( config, optimist.argv )

      //Remove optimist artifacts
      delete config.$0
      delete config._

      next(null, config)
    }

    const validate_config = (config, next) => {

      if(typeof config.period !== "number") {
        let cache_period = config.period
        config.period = period.last_closed()
        console.log(colors.italic.red(`It appears didn't set the period correctly. Period has been set to ${$config.period}`))
      }
      else if(config.period > period.last_closed()) {
        let cache_period = config.period
        config.period = period.last_closed()
        if(config.period < 0)
          console.log(colors.bold.red(`Period 0 hasn't even finished yet, exiting. try again later`)),
          process.exit()
        else
          console.log(colors.italic.red(`It appears you've set your period to ${cache_period}, has not completed yet. Period has been reset to ${config.period}`))
      }

      next(null, config)
    }

    const configuration_complete = (error, config, callback) => {
      let table = new Table('Settings')

      //Display session parameters
      Object.keys(config).forEach((key,index) => {
        table.addRow([key, config[key]])
      })

      //Save config globally
      global.config = config;

      //Some screen output.
      console.log(colors.bold.white(table.setAlign(0, Table.RIGHT).setAlign(1, Table.LEFT).render()))
      console.log(colors.white('Configured. Starting in 5 seconds.'))

      // art("Configuration Complete","1")

      setTimeout( callback, 5000 )
    }

    waterfall(
      [ show_prompt, load_config, override_config_with_params, validate_config ],
      (error, config) => configuration_complete(error, config, callback)
    )
  }

  configure( run_snapshot )
}
