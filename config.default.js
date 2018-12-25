module.exports = {
  //Take snapshot up to which period? If left undefined, it will default to the last closed period.
  period: 0,

  //The Author
  author: "Anonymous",

  //Minimum balance required for snapshot inclusion.
  //Note: 1 EOS is recommended, as there will be a minimum balance required to have the bandwidth required for a functional account. Additionally, this prevents dust from appearing as an initial accounts, and cleans up the chain.
  snapshot_minimum_balance: 1,

  //Overwrite the snapshot.json in root directory.
  overwrite_snapshot: true,

  //ETH node Connection Details
  eth_node_type: 'ipc',
  eth_node_path: '~/.local/share/io.parity.ethereum/jsonrpc.ipc',

  //Redis Connection Details
  redis_host: null,
  redis_port: null,

  //Mysql Connection Details
  mysql_db: "eos_snapshot",
  mysql_user: "root",
  mysql_pass: null,
  mysql_host: "localhost",
  mysql_port: 3306,

  //
  // Advanced/Developer settings
  // Probably do not need to change this.
  //

  //Recalculate wallets table based on already synced
  recalculate_wallets: false,

  //For if parity is syncing but you're testing for a period that you know is already synced.
  skip_web3_sync: false

  //Enable fallback 1.0? (deprecated)
  //registration_fallback: false,

  //Cache Signatures from/for fallback (deprecated)
  //cache_signatures: true,
}
