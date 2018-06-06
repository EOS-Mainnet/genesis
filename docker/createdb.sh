#!/bin/sh
echo "create database eos_snapshot_refactor;" | mysql -h db
mysql -h db eos_snapshot_refactor < bin/schema.sql
