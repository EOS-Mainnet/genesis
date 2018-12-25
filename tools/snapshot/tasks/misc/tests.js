module.exports = ( state, complete ) => {
  const Table = require( 'ascii-table' ),
        colors = require( 'colors/safe' ),
        async = require( 'async' )

  state.tests = {}

  console.log(art("tests","2"))

  const passed = (test_results) => {
    let table = new Table('Tests Passed'),
        count = 0
    Object.keys(test_results).forEach((key,index) => {
      if(test_results[key] === true) {
        table.addRow(key.replace("_", " "), '✓')
        count++
      }
    });
    if(count) console.log(colors.green(table.render()))
  }

  const failed = (test_results) => {
    let table = new Table('Tests Failed'),
        count = 0
    Object.keys(test_results).forEach(function(key,index) {
      if(typeof test_results[key] === 'string') {
        table.addRow(key.replace("_", " "), test_results[key])
        count++
      }
      if(count>0) {
        console.log(art("try again","2"))
        console.log("Try with recalculate wallets, if that doesn't work remove --resume")
      }
    });
    if(count)
      console.log(colors.red(table.render())),

      console.log(colors.red("Data has problems, cannot generate accurate snapshot from data.")),
      process.exit()
  }

  async.waterfall([
    next => next(null, state),
    require('../../tests/total-supply.js'),
    require('../../tests/liquid-supply.js'),
    require('../../tests/total-daily-buys.js'),
    require('../../tests/negative-balances.js'),
    require('../../tests/validation-balance.js')
  ], (error, state) => {
    if(error) {
      throw new Error(error)
      process.exit()
    } else {
      passed(state.tests)
      failed(state.tests)
      setTimeout( () => complete( null, state ), 5000 )
    }
  })
}
