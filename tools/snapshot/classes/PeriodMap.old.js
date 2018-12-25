let util = require('../utilities'),
    colors = require("colors/safe")

class PeriodMap {

  constructor( periodMap ){
    this.map = periodMap || []
    this.periodMax = false
  }

  beginBlock(){
    return this.map.length ? this.map[0].begin : false
  }

  endBlock( max ){
    if(max)
      return this.map.length ? this.map[max].end : false
    else
      return this.map.length ? this.map[this.map.length-1].end : false
  }

  syncedToPeriod(){
    return this.map.length-1
  }

  generate( onComplete = () => {} ){

    let map             = this.map,
        period_max      = this.periodMax ? this.periodMax : util.period.last_closed(),
        period_today    = util.period.from_date( Date.now()/1000 | 0 ),
        block_index     = map.length ? map[map.length-1].end+1 : CS_BLOCK_FIRST,
        block_cache     = null,
        period_index    = null,
        period_cache    = null

    if(typeof this.map[CS_MAX_PERIOD_INDEX] !== 'undefined' && typeof this.map[CS_MAX_PERIOD_INDEX].end === "number") {
      onComplete(this)
      return
    }


    if(period_max > CS_MAX_PERIOD_INDEX) {
      period_max = CS_MAX_PERIOD_INDEX
    }

    const message = () => {
      console.log(`---------------------`)
      console.log(`INFO: Period Map needs to be Updated - ${this.map.length > 0 ? this.map.length-1 : 'No period map found'}, syncing to Period #${this.periodMax}  (Today is Period ${period_today})`)
      console.log(`Generating new row(s) for Period Block Map (Up to Period ${period_max})`)
      console.log(`This will take a little while`)
      console.log(`---------------------`)
    }

    const iterate = () => {
      util.block.get( block_index, block => {
          //Derive a period number from the block's timestamp
          period_index = util.period.from_date( block.timestamp )

          //First run won't have a cache, set cache to previously defined index.
          if(period_cache === null) period_cache = period_index

          //The period has changed save the previously cached block number to the previous period "end"
          if(period_index != period_cache)
            map[period_cache].end = block_cache,
            console.log(colors.green(`Added period ${period_cache} to the Period Map :)`)),
            console.log(map[map.length-1])

          //IF the period index does not yet exist in the map
          //..AND the index is less than the "highest" period
          //..AND the map length is less than the total number of periods (351)
          //..THEN add the block range object to the array and set the "begin" blocknumber of that period since we just discovered it.
          if(typeof map[period_index] !== "object" && period_index <= period_max && map.length < CS_NUMBER_OF_PERIODS)
            map.push({ begin: block_index, end: null })

          //Save this period index to detect period change on next run.
          period_cache = parseInt(period_index)

          //If a period change is detected, we'll need this on next run to set the previous period's "end block"
          block_cache  = parseInt(block_index)

          //Check block on next run.
          block_index++

          //All period block ranges have been discovered
          if(map.length == CS_NUMBER_OF_PERIODS && map[CS_MAX_PERIOD_INDEX].end != null)
            this.map = map,
            onComplete( this )
          //Still have more ranges to discover
          else
            ( period_cache <= period_max ) ? setTimeout(iterate, 0) : (this.map = map, onComplete( this ))
        })
    }

    message()
    iterate()
  }

}

module.exports = PeriodMap
