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
        period_max      = typeof this.periodMax === 'number' ? this.periodMax : util.period.last_closed(),
        period_today    = util.period.from_date( Date.now()/1000 | 0 ),
        walk_index      = map.length ? map[map.length-1].end+1 : CS_BLOCK_FIRST,
        block_cache     = null,
        period_index    = null,
        period_cache    = null,

        sprint          = true,
        sprint_index    = walk_index,
        sprint_steps    = 100,

        //there's two reasons for a catch on getBlock(),
        //(1) polling,
        //(2) an unsynced chain that skipped through connections check
        //(3) parity node ran without --no-warp
        //This will help 1, without infinitely making 2 worse. It does nothing for 3. RTFM
        caught_block    = false

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
      let block_index = sprint ? sprint_index : walk_index
      web3.eth.getBlock( block_index )
        .then( block => {

        //Derive a period number from the block's timestamp
        period_index = util.period.from_date( block.timestamp )

        //First run won't have a cache, set cache to previously defined index.
        if(period_cache === null) period_cache = period_index

        //IF the period index does not yet exist in the map
        //..AND the index is less than the "highest" period
        //..AND the map length is less than the total number of periods (351)
        //..THEN add the block range object to the array and set the "begin" blocknumber of that period since we just discovered it.
        if(sprint){
          if(period_index != period_cache)
            walk_index = sprint_index-sprint_steps,
            // console.log(`SPRINT: detected new period in ${sprint_index}, setting block index to ${walk_index} and walking.`),
            sprint = false
          else
            sprint_index += sprint_steps
          iterate()
          return
        }

        //The period has changed, save the previously cached block number to the previous period "end"
        if(period_index != period_cache)
          map[period_cache].end = block_cache,
          console.log(colors.green(`Added period ${period_cache} to the Period Map :)`)),
          console.log(map[map.length-1]),
          // console.log(`WALK: found deterministic end block for ${period_cache} at ${block_index}, going to sprint again`),
          sprint_index = block_index,
          sprint = true

        if(typeof map[period_index] !== "object" && period_index <= period_max && map.length < CS_NUMBER_OF_PERIODS) {
          if(period_index == 0) {
            map.push({ begin: CS_BLOCK_FIRST, end: null })
          } else {
            map.push({ begin: map[period_index-1].end+1, end: null })
          }
        }

        //Save this period index to detect period change on next run.
        period_cache = parseInt(period_index)

        //If a period change is detected, we'll need this on next run to set the previous period's "end block"
        block_cache  = parseInt(block_index)

        //Check block on next run.
        walk_index++

        // if(map.length == CS_NUMBER_OF_PERIODS && map[CS_MAX_PERIOD_INDEX].end != null)
        //Still have more ranges to discover
        if( period_cache <= period_max )
          iterate()
        else
          this.map = map,
          onComplete( this )
      })
      .catch( e => {
        //We assume this is a block not found error related to polling. We'll rewind the sprint once, but if it fails again, we'll assume the chain is not fully synced.
        // console.log(e)
        if(!caught_block && sprint) {
          walk_index = sprint_index-sprint_steps
          sprint = false
          caught_block = true
          console.log(`Couldn't find the block, it's possible it's not confirmed/synced yet, trying again in 60 seconds.`)
          setTimeout(iterate, 60000)
        }
        else {
          sprint = true
          util.block.head( head => {
            console.log(`Need to check block #${block_index}'s timestamp, but your node's head block is ${head.number}. Trying again in 10 seconds.`)
            setTimeout(iterate, 10000)
          })
        }
      })
    }

    message()
    iterate()
  }

}

module.exports = PeriodMap
