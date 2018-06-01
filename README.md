# EOS Snapshot Generator

This tool was created to aggregate the EOS ERC20 token distribution in it's entirety, acknowledge various scenarios, run validation on data and provide files representing balances in various states.

This tool can be used to generate snapshots for **any period** in a **deterministic** fashion until the **EOS ERC20** token has been frozen. Once frozen, the tool will only produce **deterministic final** snapshots that represent the final state of the EOS ERC20 token distribution.

## Table of Contents
- [Installation](#installation)
- [Upgrade Instructions](#upgrade-instructions)
- [Troubleshooting](#troubleshooting)
- [Common Usage](#comnmon-usage)
- [Configuration Options](#configuration-options)
- [FAQ](#faq)
- [How it works](#how-it-works)
- [Glossary](#glossary)

## Utilities
- [Offline Key Generator and Validator](https://github.com/EOSIO/genesis/tree/master/tools/keys)

## External links
- [Telegram Channel](https://t.me/joinchat/GgxZkRDT3PF5tVFm9m06gw)

## Installation

### Prerequisites

#### Dependencies

1. MySQL (local or remote)
2. Parity 1.7.8+
3. [Node 8+](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions

#### Time
1. For a full sync, Parity can take 3-4 days.
2. A fresh snapshot sync can take upwards of 15 hours to the current periods.

_Plan accordingly_

### System requirements

1. Ram: 16GB+ Recommended
2. Hard drive: SSD recommended, NVME to win the race. HDD read/write speeds are intolerably slow with parity.
3. Around 128GB of free storage, required for full parity chain, database and large file exports.

### 1. Create Config File

- In the root directory of this project you'll find a `config.default.js` file.
- **Copy** `config.default.js` and rename the copy to `config.js`. The parameters are described in the file, but for your convenience they are also listed below in greater detail. **DO NOT REMOVE OR RENAME config.default.js**

### 2. MySQL
MySQL stores all the intricate details of the distribution and the contract. These instructions assume you already have MySQL configured locally or have a remote MySQL instance.

- Add your mysql details to your newly copied config file.
- Import `schema.sql` located in the `./bin` directory of this project.

### 3. Start/Sync Ethereum Node

**The instructions below are for IPC because it's the recommended connection method. HTTP/WS has issues with multi-threading, and so you will be limited to a single thread for public key sync.**

#### Parity

On most linux systems, the default IPC defined in config.default.js should work for most linux platforms.

`parity --no-warp --mode active --tracing off --pruning fast --db-compaction ssd --jsonrpc-apis all --chain mainnet --cache-size 2048`

If you're on Mac, it's suggested you pass a flag to parity to generate an IPC file, like below

`parity --mode active --tracing off --pruning fast --db-compaction ssd --jsonrpc-apis all --chain mainnet --no-warp --cache-size 2048  --ipc-path /Users/youruser/jsonrpc.ipc`

And then set that path in your config.js

**it's imperitive that you start parity with --no-warp**. If you have a pre-existing parity configuration file you've modified, you'll want to create a new configuration file for the snapshot.
**Important:** Since Parity v1.7.8 `--warp` is enabled by default. **If you fail to configure with `no-warp` you will have issues.**

**Notes**
- If you do not use IPC, you will have limited performance due to limitations with HTTP and WS transports.
- If you must use an HDD, be sure to change the `--db-compaction` parameter for parity to `hdd`, like so: `--db-compaction hdd`
- You can adjust `--cache-size` as needed, this could provide some sync-speed improvements.

Please view [Parity Documentation](https://wiki.parity.io/Configuring-Parity) if you have issues with Parity.

### 3. Configure The Snapshot Parameters

**If you're taking a "final" snapshot**, much of the configuration is automatic.
- A final snapshot will be taken automatically if the **crowdsale has ended** and the **tokens are frozen**, and will  override configured `period`. Block ranges for the snapshot will be determined by the opening block (first transaction from crowdsale contract) and the *deterministic freeze block*. This is to prevent user error.

**If you're taking an "ongoing" snapshot,** change "period" to the period for which you would like to generate a snapshot.
**Note** If you put in a period that hasn't yet completed, the "last closed period" will override your choice.


### 4. Run the Snapshot

#### Install Dependencies
From the *root directory of this project directory*, run the following:

```
npm update
npm install -g lerna
npm install
```

#### Run
_see faq for information on lerna_

`node snapshot.js --load_config`

**Note** See other useful configuration options, such as `--resume` and `--poll`, below

### 5. Connections

1. If MySQL and Parity are running, and Parity is synced, the script will start running.
2. If either MySQL or Parity are not connecting, it will keep trying every 5 seconds until a connection is established. Double-check your config and that both MySQL and Parity are running.
2. If Parity is not done syncing, it will tell you so, and let you know how far along it is. Once it's synced, it will continue.
2. If you encounter an error, see "troubleshooting"

### 6. Output

#### 6a. Directory Structure
- When complete, the script will output several files into the `./data` directory.
- Inside the `data` directory, will be a directory named after the period number you generated, for example: `./data/123.` If it's a final snapshot, into the `./data/final` directory.
- Inside that directory, is directory named after a numerical index. This is so that if you run it multiple times, you don't overwrite another snapshot.
- This functionality helps with verification of determinism and for development purposes.

#### 6b. Files
- `snapshot.csv` - This file contains the Et
um Address, EOS Key and EOS Balance of every address that registered correctly with the contract up to the configured period, and has a balance greater than the value set by `snapshot_minimum_balance` (default:1)
- `snapshot-unregistered.csv` - This file contains the Ethereum Address and EOS Balance of every address that either failed to register or registered incorrectly with the crowdsale contract up to the configured period.
- `distribution.csv` - This file includes the Ethereum Address and EOS balance of the entire distribution up to the configured period, with no rules or validation imposed.
- `snapshot.json` - This file contains information about the snapshot-session that created the above files. This file should not be used for verification, but can be used for debugging and to help identify indeterminism.

#### 6c. Snapshot in Root Directory
If `overwrite_snapshot` is set to true, all the above files will be put into the root directory of the project. If you are doing any development on this project, it's suggested that you change this to `false` (it's enabled by default in the `config.default.js` file.)

## Upgrade Instructions
1. Import bin/schema.sql to database
2. `npm update`
3. `npm install`

## Configuration Options

There are three methods for configuration
1. *Config File* (recommended)
2. *User Prompt*, fast if your using default mysql, redis and web3 settings.
3. *CLI* args, will override _Prompt_

### Snapshot Parameters
- `period` (integer, default: last closed period) The period to sync to, it will sync to the last block of any given period.
- `snapshot_minimum_balance` (integer, default: 1) Minimum balance required for inclusion in snapshots.
- `overwrite_snapshot`(boolean, default: true) Overwrites snapshots in root directory.

### Session Parameters
- `poll` (boolean) Will finish the configured period, and then try the next one. If the next one isn't ready (or tokens aren't frozen) it will continue to try every 10 seconds until there's a new period to process.
- `resume` (boolean) Will resume from last synced data. If you successfully run period 1, and the run period 3 with resume, it will only sync contract data between 1 and 3 (instead of starting fresh) and will only update wallets with changes between 1 and 3. **Important** This functionality isn't perfect, there are situations where this flag could produce a failed test and force a resync (run without resume)
- `only_produce_final_snapshot` (boolean) Should be used in conjunction with poll. It will sync contract data, but will only calculate wallets after the tokens are frozen.

### Misc
- `author` (string, default: "Anonymous") Optional meta to identify snapshotter

### Connection Details
- `eth_node_type` (http, ipc , ws) [default: http] Based on performance testing, `ipc` is recommended for local configurations and `http` is recommended for cloud configurations.
- `eth_node_path` (valid host/path) Relative to type as defined above
- `mysql_db`
- `mysql_user`
- `mysql_pass`
- `mysql_host`
- `mysql_port`

**All of the above options can be set either in your config.js or as startup parameters, simply prepend the option with `--` so for example `--poll` or `--period=111`. Startup parameters will override config.js parameters.**

## Developer Parameters
_Misuse of these parameters without understanding the implications can result in inaccurate snapshot and/or result in error_
- `recalculate_wallets` (boolean, default: false) Recalculates wallet balances without syncing contracts. Useful for development when resyncing the contracts is unnecessary (for example, you've already synced the contracts for period 1, and simply need to recalculate wallet balances for period 1)
- `skip_web3_sync` (boolean, default: false) Skips web3 sync requirement. Useful for development if you know that Parity is caught up to the period you want to sync to (for example, you want to run a snapshot on period 2, but ran period 300 last night, so you know Parity is caught up to Period 2.)




## FAQ

### Why does syncing the Ethereum Node take so long?
Because you need to sync the entire blockchain.

### Why is a database necessary?
Because this distribution requires an ETL mechanism in order to determinstically aggregate the distribution.

### What happens to tokens left unclaimed in contract?
Unclaimed tokens are attributed to the contributing address.

### What if an address sent EOS ERC20 tokens to EOSCrowdsale or EOSToken contract?
Tokens accidentally sent to one of the contracts are attributed to the sending address.

### What happens if a wallet isn't registered?
It is exposed to fallback registeration. Script will sync all ethereum public keys in block range. If it can locate a public key belonging to an unregsitered address, it will generate an EOS Public Key from the Ethereum Public Key. The Ethereum Private Key **converted to EOS WIF** should then match the EOS Public Key (NOTE: This is highly experimental, but has been tested to work with high confidence)

### What happens to the unregistered supply of tokens?
Addresses not exposed to fallback registrations that remain invalid are exported to `snapshot-unregistered.csv` file, which could prove useful.

### What is determinstic index?
Determinstic index is the order of all wallets with respect to when they were seen by either of the contract's (EOSCrowdsale and EOSTokens)

### How are account names set?
Account names the deterministic index encoded to byte32, and then padded with "genesis11111" up to 12 chars.

### Does the script validate EOS keys?
Yes

### Why is this using a web3 fork?
Because of this [unresolved issue](https://github.com/ethereum/web3.js/issues/1610)

### What happens if EOS key does not validate?
Registration Fallback will attempt to find a public key for the address, and fallback register it.

### Do I need to agree on block numbers with others for block ranges?

NO! That sounds like a recipe for indeterminism. The script will choose the deterministic end block for final snapshot, it's picks that block by detecting when the tokens were frozen. For ongoing snapshots the block ranges are determined by period, from the first block where the crowdsale had a transaction, to the last block of the defined period.

## Troubleshooting

### Tests are failing

Data is corrupted, try running with `--recalculate_wallets`, if that doesn't work, run without `resume`

###  I got a "module not found error"

```
npm update
npm install
```

### I got a "block not found" error

You probably started your Parity node without `--no-warp` (add --no-warp to parity startup), if using geth make sure `syncmode` is set to "full" (For example: `--syncmode "full"`)


### I'm seeing a useless error or I public keys don't appear to be syncing
First, run snapshot with `--verbose_mt`, this will display the stdout of the child processes for public key sync. If there's an error, look into it. Most likely you just need to `npm install`. You can also add `BLUEBIRD_LONG_STACK_TRACES=1` to your snapshot startup like... `BLUEBIRD_LONG_STACK_TRACES=1 node snapshot...`

### I get an error during NPM install related to web3 or lerna
This is related to the web3 fork mentioned in FAQ. Web3.js team runs lerna before releasing a package, this package is not listed on NPM, so your system will have to run lerna. I'm not doing the package process to keep the forked repo as close to origin as possible.
```
npm update
npm install -g lerna
npm install
```

## Common Usage

### Suggested usage (sync up to last closed period and poll)

`node snapshot --load_config --poll --resume --period=350`

If period 350 isn't closed yet, the script will reset your period to the `last_closed_period`, and then when finished try to sync again.

### Recalculate Wallets, keep contract data (failed tests)

`node snapshot --load_config --poll --resume --recalculate_wallets --period=350`

This will recalculate the wallets, but resume on the contract data.

### Start from Scratch (failed tests)

`node snapshot --load_config --period=350 --recalculate_wallets`

This is a nuke, it will truncate your contract tables and wallet table, recalculating wallets.

_Note: Public Keys table is not deleted, if you need to delete it for whatever reason, it must be done manually_

### Debug Multi-threaded

add `--verbose_mt` to startup

Verbose MT will display stdout from child processes, it's noisy, so it's disabled by default.



## Ongoing Vs Final

There are some differences between "ongoing" and "final" snapshots that need to be mentioned.

- *Ongoing* snapshots will produce accurate output based on period by constraining all blockchain activity to that range.
   - Block range for each period must be found (determinism)
   	- Block range is defined by period, first block of crowdsale to the last block of the defined period.
	- Balances are calculated cumulatively, as opposed to `balanceOf()` method provided by  EOSCrowdsale contract
	- EOS Key Registration is concluded by last registration within the block range.
- *Final* simplifies a few things.
	- Block range is defined by the first block of crowdsale (when first transaction occured) to the freeze block
	- Balances are not calculated but inferred from state returned by `balanceOf()` function provided by Token Contract.
	- EOS Key Registration utilizes `key()` public constant from crowdsale contract, registrations are not possible after 23 hours after distribution finishes.


## How It Works
#### High Level

The snapshot parameters this software proposes are as follows

1. All data is constrained by block range determined by period (for ongoing snapshots)
1. EOS Balance of an address must be greater-than or equal to `snapshot_minimum_balance` to be considered valid for snapshot export.
2. An EOS key must be associated to an account either by registration
3. If an ethereum address sent EOS ERC20 tokens to the EOS Crowdsale or EOS Token contract within the block range of the snapshot, these tokens are allocated to the respective address.
4. If an address has unclaimed EOS ERC20 tokens in the EOS Crowdsale contract within block range, these tokens are allocated to the respective address.
5. If an address is unregistered and the script was able to find a public key belonging to the address, it will generate an EOS Public Key that matches the holding addresses' Ethereum private key.
5. Registered addresses whose EOS key validates and whose EOS ERC20 balance is greater-than or equal to the `minimum_snapshot_balance` are exported to `snapshot.csv` file (ethereum address, EOS public key, balance)
5. Addresses that are not registered but are equal to or greater-than the `minimum_snapshot_balance`, will be exported to `snapshot_unregistered.csv` (ethereum address, balance)
6. Entire distribution is exported to `distribution.csv` file without any rules or validation applied (ethereum address, balance)


<a name="snapshot-install-manual-about-lowlevel"></a>
#### Low Level

The script employs strict patterns to encourage predictable output, often at the expense of performance. The pattern is *aggregate - calculate - validate* and closely resembles an ETL or _extract, transform and load_ pattern. This decision came after numerous iterations and determining that debugging from state was more efficient than debugging from logs.

Below is the script transposed to plain english.

1. User Configured Parameters are set through one of three methods.
2. Check Connections to MySQL, Redis and Web3
3. Truncate Databases
4. Generate Period Map

	1. Used to define block ranges of periods
	2. Determines the block range that the snapshot is based upon

5. Set Application State Variables (including user configurations)
6. Set Block Range

	7. If tokens are frozen, force the snapshot block range to `state.block_state` and the deterministic freeze block (block tokens were frozen)
	8. Otherwise, set block range to user defined block range.

6. Sync Public keys

	7. For every address between block range, sync ethereum public keys to table.

	8. If IPC connection, use multi-threaded implementation.
5. Sync history of token and crowdsale contract.

	1. EOS Transfers
	2. Buys
	3. Claims
	4. Registrations
	5. Reclaimable Transfers
	6. Resuming:

		6. If resume is set, it will only sync data from where it left off

		7. Otherwise, contract tables will be truncated and it will re-sync everything from scratch.
2. Compile list of every address that has ever had an EOS balance, for each address:

	1. Aggregate relevant txs

		1. Claims and Buys, required for Unclaimed Balance Calculation
		2. Transfers, all incoming and outgoing tx from address
		3. Reclaimable Transfers, every reclaimable has a corresponding transfer [special case]
		4. The last registration transaction to occur within defined block range

	2. Calculate

		1. Sum Wallet Balance (sum(transfers_in) - sum(transfers_out))
		2. Calculate Unclaimed Balance
		3. Sum Reclaimed Transfer Balances
		4. Sum Balances
		5. Convert balances from gwei

	3. Validate

		1. 	Check Wallet Balance
		2. Validate EOS Key, if valid set `registered` to `true`
		3. If EOS key error, save error to column `register_error`
		4. If all validated, set `valid` to true.
	5. Process

		6. Save every wallet regardless of validation or balance to `wallets` table

          6. Resuming:

	           7. resume is set and recalculate_wallets is not set, it will only process the above data for addresses with changes since the last sync and adjust block range for wallets accordingly (in the case of buys, it will aggregate based on period not on block range, because future buys are possible)

		8. resume is not set or recalculate_wallets is set, it will truncate wallets table and process all addresses.
1. Registration Fallback

	1. Query invalid addresses, above minimum snapshot threshold and without register error "exclude" (EOSToken/Crowdsale contracts)
	2. Attempt to locate public key for each addrses

		1. if a public key is found, convert it to an EOS Key, update the wallet with the generated key, set fallback to true and set valid to true.

2. Deterministic Index and Account Names

	3. 	Query addresses `order by first_seen, address` in batches of 10000.
	4. For each batch set the deterministic index and generate the account name
	5. Update each address.

3. Test
	1. Daily Totals from DB against daily totals from EOS Utility Contract, failure here would not fail the below tests, but would instead result in inaccurate unclaimed balances. Difficult problem to detect without this test.
	2. Total Supply, margin of error should be low due to _dust_ from rounding (generally 0.00000001%)
   3. Negative Balances, there should be **zero** negative balances
7. Output
	1. **snapshot.csv** - comma-delimited list of ETH addresses, EOS keys and Total EOS ERC20 Balances (user, key, balance respectively)
		
		1. Move all valid entries from `wallets` table to `snapshot` table, ordered by balance DESC.
		2. Generate snapshot.csv from `snapshot` table
	1. **snapshot_unregistered.csv** - comma-delimited list of ETH addresses and Total EOS ERC20 Balances (user, balance respectively)
		
		1. Move all invalid entries whose balance is greater-than or equal-to `minimum_snapshot_balance` from `wallets` table to `snapshot_unregistered` table, ordered by balance DESC.
		2. Generate snapshot_unregistered.csv from `snapshot_unregistered` table

	1. **distribution.csv** - comma-delimited list of ETH addresses and Total EOS ERC20 Balances (user, balance respectively) **does not include EOS keys!**
		
		1. Export all Ethereum Addresses and EOS ERC20 total balances from `wallets` table without any rules of validation imposed to **distribution.csv**

   2. **snapshot.json** - Snapshot meta data

		1. Snapshot parameters
		2. Test results
		3. General Statistics
		4. Generate MD5 Checksums
			1. 	From generated **snapshot.csv** file, useful for debugging and auditing
			2. From mysql checksum for every table in database (useful for debugging)
		5. Pass any other useful state variables into object



## Glossary

- **wallet balance** - The wallet balance is refers to an address's EOS ERC20 token balance
- **unclaimed balance** - An unclaimed balance refers to tokens that were never claimed by an address. Despite being unclaimed, these still belong to the contributing address.
- **reclaimed balance** - A reclaimed balance refers to EOS ERC20 tokens accidentally sent to the EOSCrowdsale or EOSToken contract. The balances of these contracts are not included in distribution calculations, so it's imperitive these balances are calculated to have accurate supply values.  
- **total balance** - The sum of **wallet** + **unclaimed** + **reclaimed** balances. The total balance is what is included as a user's balance in snapshots.
- **registered address** - A registered address is an address with a balance greater than or equal to the `minimum_snapshot_balance` that has correctly registered their ethereum address with the EOSCrowdsale contract using a valid EOS Public Key.
- **unregistered address** - An unregistered address is an address with a balance greater than or equal to the - `minimum_snapshot_balance` that has either incorrectly registered  or failed to register their address with an EOS Public Key.
- **freeze block** - The freeze block is a deterministic value represented by the block number representing the period that tokens were frozen. This block will mark the last block for which actions sent to the crowdsale contract will be honored (such as registrations)
- **snapshot** - A file containing EOS public keys and balances that can be imported during an EOSIO boot sequence.
- **snapshot-unregistered** - A file containing Ethereum addressees and balances. This file could potentially be imported during an EOSIO boot sequence into the table of a contract that enables Ethereum based claiming.
- **liquid supply** - The liquid supply represents total aggregate EOS ERC20 tokens that are presently in circulation and detected by snapshot script, after the crowdsale ends, the liquid supply should equal the total supply.
- **expected supply** - Expected supply is a mathematically determined value representing what the script expects the liquid supply to equal. Liquid Supply should be within 0.00000001% of expected supply as a result of dust acquired by precision reduction.
- **registration fallback** - Registering an EOS Public Key for an unregistered address utilizing a discovered public key.
