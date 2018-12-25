# ************************************************************
# Sequel Pro SQL dump
# Version 4541
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 5.6.37)
# Database: eos_snapshot_refactor
# Generation Time: 2018-05-21 10:27:33 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table buys
# ------------------------------------------------------------

DROP TABLE IF EXISTS `buys`;

CREATE TABLE `buys` (
  `uuid` varchar(256) NOT NULL,
  `tx_hash` varchar(256) NOT NULL DEFAULT '',
  `block_number` int(255) NOT NULL,
  `address` varchar(256) NOT NULL,
  `period` int(11) NOT NULL,
  `eth_amount` decimal(65,0) NOT NULL DEFAULT '0',
  PRIMARY KEY (`uuid`),
  KEY `INDEXADDRESS` (`address`),
  KEY `INDEXBN` (`block_number`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table claims
# ------------------------------------------------------------

DROP TABLE IF EXISTS `claims`;

CREATE TABLE `claims` (
  `uuid` varchar(256) NOT NULL,
  `tx_hash` varchar(256) NOT NULL DEFAULT '',
  `block_number` int(255) NOT NULL,
  `address` varchar(256) NOT NULL DEFAULT '',
  `period` int(11) NOT NULL,
  `eos_amount` decimal(65,0) NOT NULL DEFAULT '0',
  PRIMARY KEY (`uuid`),
  KEY `INDEXADDRESS` (`address`),
  KEY `INDEXBN` (`block_number`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table public_keys
# ------------------------------------------------------------

DROP TABLE IF EXISTS `public_keys`;

CREATE TABLE `public_keys` (
  `address` varchar(256) NOT NULL DEFAULT '',
  `public_key` varchar(256) NOT NULL DEFAULT '',
  `block_number` int(11) NOT NULL,
  PRIMARY KEY (`address`),
  KEY `INDEXBN` (`block_number`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table reclaimables
# ------------------------------------------------------------

DROP TABLE IF EXISTS `reclaimables`;

CREATE TABLE `reclaimables` (
  `uuid` varchar(256) NOT NULL,
  `tx_hash` varchar(256) NOT NULL DEFAULT '',
  `block_number` varchar(256) NOT NULL DEFAULT '',
  `address` varchar(256) NOT NULL DEFAULT '',
  `eos_amount` decimal(65,0) NOT NULL DEFAULT '0',
  PRIMARY KEY (`uuid`),
  KEY `INDEXADDRESS` (`address`),
  KEY `INDEXBN` (`block_number`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table registrations
# ------------------------------------------------------------

DROP TABLE IF EXISTS `registrations`;

CREATE TABLE `registrations` (
  `uuid` varchar(256) NOT NULL,
  `tx_hash` varchar(256) NOT NULL DEFAULT '',
  `position` int(11) NOT NULL,
  `block_number` int(255) NOT NULL,
  `address` varchar(256) NOT NULL DEFAULT '',
  `eos_key` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `INDEXADDRESS` (`address`),
  KEY `INDEXBN` (`block_number`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table snapshot
# ------------------------------------------------------------

DROP TABLE IF EXISTS `snapshot`;

CREATE TABLE `snapshot` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `account_name` varchar(12) NOT NULL DEFAULT '',
  `user` varchar(256) NOT NULL DEFAULT '',
  `key` varchar(256) NOT NULL DEFAULT '',
  `balance` decimal(15,4) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table snapshot_unregistered
# ------------------------------------------------------------

DROP TABLE IF EXISTS `snapshot_unregistered`;

CREATE TABLE `snapshot_unregistered` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `account_name` varchar(12) NOT NULL DEFAULT '',
  `user` varchar(256) NOT NULL DEFAULT '',
  `balance` decimal(15,4) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table state
# ------------------------------------------------------------

DROP TABLE IF EXISTS `state`;

CREATE TABLE `state` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `meta_key` varchar(256) NOT NULL,
  `meta_value` longtext,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQKEY` (`meta_key`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table transfers
# ------------------------------------------------------------

DROP TABLE IF EXISTS `transfers`;

CREATE TABLE `transfers` (
  `uuid` varchar(256) NOT NULL,
  `tx_hash` mediumtext NOT NULL,
  `block_number` int(255) NOT NULL,
  `from` varchar(256) NOT NULL DEFAULT '',
  `to` varchar(256) NOT NULL DEFAULT '',
  `eos_amount` decimal(65,0) NOT NULL DEFAULT '0',
  PRIMARY KEY (`uuid`),
  KEY `FROMINDEX` (`from`),
  KEY `TOINDEX` (`to`),
  KEY `INDEXBN` (`block_number`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table wallets
# ------------------------------------------------------------

DROP TABLE IF EXISTS `wallets`;

CREATE TABLE `wallets` (
  `address` varchar(256) NOT NULL,
  `eos_key` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `balance_wallet` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `balance_unclaimed` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `balance_reclaimed` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `balance_total` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `registered` tinyint(1) NOT NULL DEFAULT '0',
  `fallback` tinyint(1) NOT NULL DEFAULT '0',
  `register_error` varchar(256) DEFAULT NULL,
  `fallback_error` varchar(256) DEFAULT NULL,
  `valid` tinyint(1) NOT NULL DEFAULT '0',
  `deterministic_index` int(11) DEFAULT NULL,
  `account_name` varchar(256) DEFAULT NULL,
  `first_seen` int(11) DEFAULT NULL,
  PRIMARY KEY (`address`),
  KEY `EOSKEYINDEX` (`eos_key`(191))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
