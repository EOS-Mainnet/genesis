#!/bin/bash

#Install parity
bash <(curl https://get.parity.io -Lk) -r stable

#Install Node
sudo apt-get update
curl -sL https://deb.nodesource.com/setup_8.x | bash -
apt-get install -y nodejs
nodejs -v

#Install MySQl
sudo apt-get install mysql-server
mysql_secure_installation
systemctl status mysql.service

#Get Genesis Script
cd /home/
git clone https://github.com/EOSIO/genesis.git
cd genesis
npm install
cp config.default.js config.js
nano config.js
