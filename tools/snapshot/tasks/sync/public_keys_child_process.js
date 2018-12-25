require('../../lib/globals')

const CACHE_THRESHOLD = 250

let   id,
      state,
      thread_block_begin,
      thread_block_end,
      current_block

const setup = settings => {

  id = settings.id
  threads = settings.threads
  state = settings.state

  block_begin = settings.resume_block
  block_end   = state.block_end

  //Since we've gotten this far, we'll assume web3 is synced, it'll shave off another 30 seconds.
  settings.config.skip_web3_sync = true

  global.config = settings.config

  let blocks_to_sync = block_end-block_begin,
      blocks_per_thread = Math.floor(blocks_to_sync/threads),
      blocks_extra = blocks_to_sync-(blocks_per_thread*threads)

  thread_block_begin = block_begin+id
  thread_block_end = thread_block_begin + blocks_to_sync - blocks_extra
  thread_block_end = (thread_block_end > block_end) ? thread_block_end - threads : thread_block_end

  const connections = require('../misc/connections')
  connections(state, ( error, response ) => {
    setTimeout(run, id*11)
  })
}

const run = () => {
  const db             = require('../../models'),
        query          = require('../../queries'),
        db_config      = {ignoreDuplicates: true},
        colors         = require('colors/safe'),
        _for           = require('async-for'),
        each           = require('async').each,

        util           = require('../../utilities'),
        scanCollection = require('../../helpers/web3-collection'),
        bn             = require('bignumber.js')

  let   sync = {},
        log_intval,
        iterator,
        cache = "",
        cache_count = 0,
        block_current = 0,
        log = ""

  const process_transactions = (block, next) => {
    each(
      block.transactions,
      find_pub_key_and_cache,
      (err) => {
        if(err)
          throw new Error(err)
        else
          current_block+=threads,
          next()
      }
    )
  }

  const find_pub_key_and_cache = (tx, finished) => {
    util.misc.get_tx(tx.hash).then( result => {
      let pubkey = result.publicKey
      if(pubkey.length && typeof pubkey !== 'undefined') {
        if(cache_count!=0) cache+=', '
        cache += `("${tx.from}", "${pubkey}", ${tx.blockNumber})`
        cache_count++
      }
      finished()
    })
  }

  const sync_public_keys = result => {

    current_block = thread_block_begin

    console.log(`Thread ${id}: Syncing public keys between ${thread_block_begin} and ${thread_block_end} with a ${id} offset with ${threads} steps between each block`)

    const loop = _for(thread_block_begin, function (i) { return current_block<=thread_block_end }, function (i) { return i + 1; },
      function loopBody(i, _break, _continue) {
        web3.eth
          .getBlock( current_block, true )
          .then( block => {
            if(current_block == thread_block_end)
              console.log(`Thread ${id}: Last Pass Detected - Current:${current_block}, End: ${thread_block_end}`)

            if(cache_count>=CACHE_THRESHOLD || current_block == thread_block_end && cache_count>0)
              save_rows( () => { process_transactions(block, _continue ) } )
            else
              process_transactions(block, _continue )
          })
          .catch(e => { throw new Error(e) })
        }
    )

    loop(() => {
      console.log(colors.green(`Thread ${id}: Pubkey Syncing Complete`))
      setTimeout(() => { process.exit() }, 5000)
    })

  }

  const public_key_query = () => {
    //Multiple threads can create indeterminism in this table, particularly if public key is added during period cross-over.
    //Conditional on duplicate key update will maintain determinism in this table, always save the lowest block number.
    // const query = `INSERT INTO public_keys (address, public_key, block_number) VALUES ('${record.address}', '${record.public_key}', ${record.block_number}) ON DUPLICATE KEY UPDATE block_number = IF(block_number > ${record.block_number}, ${record.block_number}, block_number); `
    return `INSERT INTO public_keys (address, public_key, block_number)
                    VALUES ${cache}
                  ON DUPLICATE KEY UPDATE
                    block_number = CASE WHEN VALUES(block_number)<block_number THEN VALUES(block_number) ELSE block_number END;`
  }

  const update_state = () => {
    let percent_complete = ((100-0)/(thread_block_end-thread_block_begin)*(parseInt(current_block)-thread_block_end)+100).toFixed(1)
    process.send({thread: id, block: parseInt(current_block), progress: `${percent_complete}%` })
   }

  const save_rows = ( callback, deadlock ) => {
    db.sequelize.query( public_key_query(), { retry: { match: [ /Deadlock/i ], max: 1000 } } )
      .then( result => {
        if(deadlock) console.log(colors.green(`Thread ${id}: DEADLOCK: RESOLVED`))
        cache = ""
        cache_count = 0
        update_state()
        callback()
      })
      .catch( e => {
        if(e.toString().toLowerCase().includes("deadlock")) {
          console.log(colors.red(`Thread ${id}: DEADLOCK: RETRY`))
          setTimeout( () => save_rows(callback, true), 100 )
        } else {
          throw new Error(e)
        }
      })
  }

  sync_public_keys()
}

process.on('message', setup)
