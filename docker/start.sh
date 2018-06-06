#!/bin/sh
parity --mode active --tracing off --pruning fast --db-compaction hdd --jsonrpc-apis all --chain mainnet --no-warp --cache-size 2048 &
node snapshot.js --load_config
