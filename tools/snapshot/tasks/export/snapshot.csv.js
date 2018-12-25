module.exports = ( state, callback ) => {

  const async        = require('async'),
        json_to_csv  = require('json-to-csv'),
        fs           = require('fs'),
        db           = require('../../models')

  const csv = callback => {
    db.Snapshot
      .findAll({ order: [ ['id', 'ASC'] ] }, {type: db.sequelize.QueryTypes.SELECT})
      .then( results => {
        let _results = results.map( result => {
          return {user: result.dataValues.user, account_name: result.dataValues.account_name, key: result.dataValues.key, balance: result.dataValues.balance}
        })
        json_to_csv(_results, state.files.path_snapshot_csv, false)
          .then(() => {
            console.log(`${results.length} Records Saved to CSV`)
            if(config.overwrite_snapshot) fs.createReadStream(state.files.path_snapshot_csv).pipe(fs.createWriteStream(state.files.file_snapshot_csv))
            callback(null, state)
          })
          // .catch( error => { throw new Error(error) } )
      })
      // .catch( error => { throw new Error(error) })
  }

  //It may seem redundant to do a select and insert on table and then find it again a second later,
  //but there's a number of things that can happen with large queries in transport,
  //This gives us a way to track and resolve (speaking from experience with ETL patterns)
  //SQL is probablistically unlikely to hiccup here, so we have a constant if data is saved to table first.
  db.Snapshot
    .destroy({ truncate : true, cascade: false })
    .then( () => {
      db.sequelize
        .query('INSERT INTO snapshot (id, user, account_name, `key`, balance) SELECT deterministic_index, address, account_name, eos_key, balance_total FROM wallets WHERE valid=1 ORDER BY deterministic_index ASC, address ASC')
        .then(results => {
          console.log( 'Snapshot Table Synced' )
          csv( callback )
        })
        // .catch( error => { throw new Error(error) })
    })
}
