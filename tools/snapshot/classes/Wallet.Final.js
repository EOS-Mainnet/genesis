const async  = require('async'),
      bn     = require('bignumber.js'),
      Wallet = require('./Wallet'),
      util = require('../utilities'),
      address_key = require('../helpers/web3-address').key

class WalletFinal extends Wallet {

  process_key( complete ){
    address_key( this.address )
      .then( key => {
        //encode because some of register function exploits ... fixes a different problem from the web3 fork problem
        this.eos_key = util.misc.sanitize_user_input(key)
        this.maybe_fix_key()
        complete()
      })
      .catch( e => {
        throw new Error(e)
      })
  }

  process_balance_wallet( complete ){
    util.balance.wallet_token_state( this.address, balance => {
      this.balance.set( 'wallet', balance )
      complete()
    })
  }

  process_balance_unclaimed( complete ){
    util.balance.unclaimed( this.buys, this.claims, CS_NUMBER_OF_PERIODS, balance => {
      this.balance.set( 'unclaimed', balance )
      complete()
    })
  }

  process_balance_reclaimed( complete ){
    util.balance.reclaimed( this.reclaimables, balance => {
      this.balance.set( 'reclaimed', balance )
      complete()
    })
  }

  process_balance_sum( complete ){
    this.balance.sum()
    complete()
  }

  process_balance_from_wei( complete ){
    this.balance.from_wei()
    complete()
  }

  process_balance_format( complete ){
    this.balance.format()
    complete()
  }

  process_judgement( complete ){
    this.valid() ? this.accept() : this.reject()
    complete()
  }

  process_exclude(complete){
    const exclude = [CS_ADDRESS_CROWDSALE, CS_ADDRESS_TOKEN]
    // if(!this.config.include_b1) exclude.push(CS_ADDRESS_B1)
    if(exclude.indexOf(this.address) > -1)
      this.accepted           = false,
      this.register_error     = 'exclude'
    complete()
  }

  process( callback ) {
    async.series([
      ( complete ) => this.process_key( complete ),
      ( complete ) => this.process_balance_wallet( complete ),
      ( complete ) => this.process_balance_unclaimed( complete ),
      ( complete ) => this.process_balance_reclaimed( complete ),
      ( complete ) => this.process_balance_sum( complete ),
      ( complete ) => this.process_balance_from_wei( complete ),
      ( complete ) => this.process_balance_format( complete ),
      ( complete ) => this.process_judgement( complete ),
      ( complete ) => this.process_exclude( complete )
    ],(err, result) => {
      callback( this.json() )
    })
  }
}

module.exports = WalletFinal
