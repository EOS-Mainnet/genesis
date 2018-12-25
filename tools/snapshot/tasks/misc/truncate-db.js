module.exports = ( state, complete ) => {



  const async = require('async'),
        db = require('../../models')

  // if(config.recalculate_wallets === true || config.resume) {
  //   console.log('recalculate_wallets set to true, skipping truncation')
  //   db.Wallets.destroy({ truncate : true, cascade: false }).then(() => {
  //     complete(null, state)
  //   })
  //   return
  // }
  // else

  if(!config.resume) {

    console.log('Truncating tables, starting clean')
    async.series([
      next => db.Wallets.destroy({ truncate : true, cascade: false }).then(next),
      next => db.Transfers.destroy({ truncate : true, cascade: false }).then(next),
      next => db.Claims.destroy({ truncate : true, cascade: false }).then(next),
      next => db.Buys.destroy({ truncate : true, cascade: false }).then(next),
      next => db.Reclaimables.destroy({ truncate : true, cascade: false }).then(next),
      next => db.Registrations.destroy({ truncate : true, cascade: false }).then(next)
    ], () => complete( null, state ) )
  }
  else {
    // console.log(art("step 4b\nskipped truncation","1"))
    console.log('Skipping truncation (resume is set to true)')
    complete( null, state )
  }

}
