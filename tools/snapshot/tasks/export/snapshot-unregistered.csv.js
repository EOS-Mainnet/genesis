module.exports = ( state, callback ) => {

  const async        = require('async'),
        json_to_csv  = require('json-to-csv'),
        fs           = require('fs'),
        db           = require('../../models')

  const csv = () => {
    db.SnapshotUnregistered
      .findAll({ order: [ ['id', 'ASC'] ] })
      .then( results => {
        let _results = results.map( result => {
          return {user: result.dataValues.user, account_name: result.dataValues.account_name, balance: result.dataValues.balance}
        })
        if(results.length)
          json_to_csv(_results, state.files.path_snapshot_unregistered_csv, false)
            .then(() => {
              console.log(`${results.length} Records Saved to CSV`)
              if(config.overwrite_snapshot) fs.createReadStream(state.files.path_snapshot_unregistered_csv).pipe( fs.createWriteStream(state.files.file_snapshot_unregistered_csv) )
              callback(null, state)
            })
        else
          console.log(`snapshot_unregistered.csv not generated because there were no unregistered addresses (It's a perfect world?)`),
          callback(null, state)
      })
      // .catch( error => { throw new Error(error) })
  }

  //It may seem redundant to do a select and insert on table and then find it again a second later,
  //but there's a number of things that can happen with large queries in transport,
  //This gives us a way to track and resolve (speaking from experience with ETL patterns)
  //SQL is probablistically unlikely to hiccup here, so we have a constant if data is saved to table first.
  db.SnapshotUnregistered
    .destroy({ truncate : true, cascade: false })
    .then( () => {
      db.sequelize
        .query(`INSERT INTO snapshot_unregistered (id, user, account_name, balance) SELECT deterministic_index, address, account_name, balance_total FROM wallets WHERE valid=0 AND register_error!='exclude' AND balance_total>=${config.snapshot_minimum_balance} ORDER BY deterministic_index ASC, address ASC`)
        .then(results => {
          console.log( 'Unregistered Snapshot Table Synced' )
          csv( callback )
        })
        // .catch( error => { throw new Error(error) })
    })

}
