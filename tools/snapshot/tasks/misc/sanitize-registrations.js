module.exports = (state, complete) => {

  const db = require('../../models'),
        util = require('../../utilities')

  db.sequelize.query('SELECT * FROM registrations WHERE eos_key REGEXP "[^a-z0-9]+"', {type: db.sequelize.QueryTypes.SELECT})
    .then( results => {
      if(!results.length) {
        console.log("EOS Keys look clean, moving on.")
        complete(null, state)
      } else {
        console.log(`Sanitizing ${results.length} EOS Keys from Previous Versions`)
        fixed_keys = results.map( result => {
          console.log(result)
          result.eos_key = util.misc.sanitize_user_input(decodeURIComponent(result.eos_key))
          return result
        })
        db.Registrations.bulkCreate( fixed_keys, { updateOnDuplicate: true })
          .then( () => complete(null, state) )
          .catch( e => { throw new Error(e) })
      }

    })
}
