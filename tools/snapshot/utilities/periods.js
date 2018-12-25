let bn = require('bignumber.js')

const between = function (block, min, max) {
  return this >= min && this <= max;
}

const changed = (compare_period) => {
  return last_closed() > compare_period
}

const from_date = timestamp  => {
  return timestamp < CS_START_TIME ? 0 : Math.min(Math.floor((timestamp - CS_START_TIME) / CS_PERIOD_LENGTH_SECONDS ) + 1, CS_NUMBER_OF_PERIODS)
}

//TODO: Deprecate
const from_block = ( period_map, block ) => {
  let period = period_map.map( (range, index) => ( between(block, range.begin, range.end) ? index : null ) ).filter( period => period != null )
  return period.length && period!=null ? period[0] : false
}

const last_closed = ( callback ) => {
  return from_date(Date.now() / 1000 | 0)-1
}

const begin_to_block = ( period_map, period ) => {
  if(typeof period_map[period] !== "undefined")
    return period_map[period].begin
}

const end_to_block = ( period_map, period ) => {
  if(typeof period_map[period] !== "undefined")
    return period_map[period].end
}

const daily_totals = ( callback ) => {
  let contract  = require('../helpers/web3-contract')
  contract.$utility.methods.dailyTotals().call()
    .then( totals => {
      let t = totals.map( total => new bn(total) )
      callback(t)
    })
    .catch( e => { throw new Error(e) } )
}

const expected_supply = (period, include_b1) => {
  let result = new bn(CS_CREATE_FIRST_PERIOD).div(WAD).plus( new bn(CS_CREATE_PER_PERIOD).div(WAD).times(new bn(period)) ).plus(new bn(CS_B1_DISTRIBUTION).div(WAD))
  return result.toFixed(4)
}

module.exports = {
  from_date: from_date,
  from_block: from_block,
  last_closed: last_closed,
  begin_to_block: begin_to_block,
  end_to_block: end_to_block,
  daily_totals: daily_totals,
  expected_supply: expected_supply
}
