module.exports = ( state, complete ) => {

  const cpus = require('os').cpus,
        cp = require('child_process'),
        parallel = require('async').parallel,
        series = require('async').series,
        optimist = require('optimist'),
        db = require('../../models'),
        colors = require('colors/safe')

  let threads = cpus().length,

      cache = [],
      control_flow = [],
      stats = [],
      resume_block = 0,
      lowest_block = 0,

      logIntval,
      progressIntval

  console.log(art("sync keys","2"))

  // if(config.recalculate_wallets === true) {
  //   console.log('recalculate_wallets set to true, skipping ethereum public key sync')
  //   complete(null, state)
  //   return
  // }

  if(config.eth_node_type !== "ipc") {
    console.log(colors.bold.red("Multithreaded implementation cannot be used on HTTP JSON RPC or WS!!!! IPC SUGGESTED!"))
    console.log(colors.bold.red("Threads Available for HTTP/WS: 1"))
    threads = 1
  }

  // if(config.registration_fallback === false) {
  //   console.log('registration_fallback set to false, skipping ethereum public key sync')
  //   complete(null, state)
  //   return
  // }

  console.log(`${threads} cpus detected`)

  const setup = callback => {
    find_resume_block( () => {
      for(let i=0;i<threads;i++) {
        control_flow.push(callback => {
          thread_process(i, callback)
        })
      }
      logIntval = setInterval(log, 25000)
      callback()
    })
  }

  const run = () => {
    progress_interval()
    parallel(control_flow, (error, result) => {
      console.log('All threads complete')
      clearInterval(progressIntval)
      clearInterval(logIntval)
      cache_lowest_block()
      save_resume_block( () => {
        console.log(`Resume Block #${resume_block} Saved to State`)
        log()
        complete(null, state)
      })
    })
  }

  const thread_process = (i, callback) => {

    let thread,
        settings = {
          id:i,
          threads:threads,
          state:state,
          config:config,
          resume_block:resume_block
        }

    if(optimist.argv.verbose_mt) {
      thread = cp.fork(`tools/snapshot/tasks/sync/public_keys_child_process.js`)
    } else {
      thread = cp.fork(`tools/snapshot/tasks/sync/public_keys_child_process.js`, [], { stdio: "ignore" })
    }

    const onMessage = (thread, message) => {
      stats[message.thread] = message
      cache_lowest_block()
    }

    const onClose = (thread, callback) => {
      console.log(`Thread ${thread}: Closed, reporting complete`)
      callback()
    }

    thread
      .on('message', (m) => onMessage(i, m) )
      .on('close', (m) => onClose(i, callback))
      .send(settings)

  }

  const progress_interval = () => {
    progressIntval = setInterval( () => save_resume_block(), 3000 )
  }

  const cache_lowest_block = () => {
    let blocks = stats.map( stat => stat.block ).filter(Number)
    // console.log(stats)
    if(blocks.length)
      lowest_block = Math.min.apply(null, blocks)
  }

  const save_resume_block = (callback=()=>{}) => {
    if(resume_block>0 && lowest_block>0) {
      db.State
        .upsert({ meta_key: `sync_progress_keys`, meta_value: lowest_block })
        .then( callback )
        .catch( e => {throw new Error(e)})
    } else {
      callback()
    }
  }

  const find_resume_block = callback => {
    db.State
     .findAll({
        attributes: ['meta_value'],
        where: { meta_key: `sync_progress_keys` }
      })
      .then(resume_from => {
        if(resume_from && resume_from.length)
          resume_block = parseInt(resume_from[0].dataValues.meta_value),
          console.log(`Parent: Resuming from Block #${resume_block}`)
        else
          resume_block = state.block_begin,
          console.log(`Parent: No resume block found, starting at #${resume_block}`)

        callback()
      })
      .catch( e => { throw new Error(e) })
  }

  const log = () => {
    // let count = 0;
    console.log(`-----------------`)
    stats.forEach( message => {
      console.log(`${message.thread}: ${message.progress} @ ${message.block}`)
      // count++
    })
    console.log(`-----------------`)
    console.log(`  `)
  }

  setup( run )
}
