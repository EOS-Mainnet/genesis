let contract  = require('../helpers/web3-contract')

const head = ( callback ) => {
  web3.eth.getBlock('latest')
    .then( callback )
    .catch( e => { throw new Error(e)} )
}

const head_timestamp = ( callback ) => {
  web3.eth.getBlock('latest')
    .then( block => callback(block.timestamp) )
    .catch( e => { throw new Error(e)} )
}

const head_number = ( callback ) => {
  web3.eth.getBlockNumber()
    .then( callback )
    .catch( e => { throw new Error(e)} )
}

const get = ( block_number, callback ) => {
  web3.eth.getBlock( block_number )
    .then( callback )
    .catch( e => { throw new Error(e) } )
}

module.exports = {
  head: head,
  head_number: head_number,
  head_timestamp: head_timestamp,
  get: get
}
