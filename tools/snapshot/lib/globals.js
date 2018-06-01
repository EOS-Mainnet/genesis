const bn = require('bignumber.js')

global.VERSION                            = "0.4.5"

//Crowdsale Globals
global.CS_ADDRESS_CROWDSALE               = "0xd0a6e6c54dbc68db5db3a091b171a77407ff7ccf"
global.CS_ADDRESS_TOKEN                   = "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0"
global.CS_ADDRESS_UTILITIES               = "0x860fd485f533b0348e413e65151f7ee993f93c02"
global.CS_ADDRESS_B1                      = "0x00000000000000000000000000000000000000b1"

global.CS_BLOCK_FIRST                     = 3904416

global.CS_OPEN_TIME                       = 1498482000
global.CS_START_TIME                      = 1498914000

global.CS_NUMBER_OF_PERIODS               = 351
global.CS_MAX_PERIOD_INDEX                = CS_NUMBER_OF_PERIODS-1
global.CS_PERIOD_LENGTH_SECONDS           = 23 * 60 * 60 //in seconds
global.CS_PERIOD_ETH                      = []

//Token Globals
global.WAD                                = new bn(1000000000000000000)
global.CS_CREATE_FIRST_PERIOD             = new bn(200000000).times(WAD)
global.CS_CREATE_PER_PERIOD               = new bn(2000000).times(WAD)
global.CS_B1_DISTRIBUTION                 = new bn(100000000).times(WAD)

global.CS_TOTAL_SUPPLY                    = new bn(1000000000).times(WAD)

global.SS_STARTED_TIMESTAMP               = Date.now()/1000 | 0
global.SS_ACCEPTABLE_SUPPLY_DEVIATION     = 5 //total number of EOS deviation allowed to be considered an "accurate" snapshot, usually less than 1/-1. 5 is generous.

global.CS_END_TIME                        = CS_START_TIME + ((CS_MAX_PERIOD_INDEX) * CS_PERIOD_LENGTH_SECONDS)
// global.CS_END_TIME                        = 1527893999

//EOS Keys to disallow from inclusion in snapshot becuase their private key is publicly available.
// Note1: Burned Keypairs
// Note2: https://github.com/EOSIO/eos/issues/3577
// Note3: https://github.com/EOSIO/eos/issues/3584
global.BURNED_EOS_KEYS                    = ["EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV", "EOS6qnCLMm5d67JdP11EF31Kf4UUNr6ktUKBqPsDhSXADT1CHfNG2", "EOS6vizDzpZMxtt27WVVCUVYEFHXgaLhEfPuLQAXfpAJaf2oWAcwg", "EOS7KKga2itCjyLAm6n4GHqujN4arBv3GQEWpZwQqSDWyNEj7iuxQ", "EOS6iBVEaRDS3mofUJpa8bjD94vohHrsSqqez1wcsWjhPpeNArfBF"]

//For screen output
global.art = require('ascii-text-generator')

//Services are global to help avoid extraneous connection bottlenecks.
global.web3
global.mysql
global.redis
