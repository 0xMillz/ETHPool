require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const { INFURA_API_KEY, MNEMONIC } = process.env

module.exports = {
    migrations_directory: './migrations',
    contracts_build_directory: './public/contracts',
    networks: {
        development: {
            host: '127.0.0.1',
            port: 7545,
            network_id: '5777',
        },
        ropsten: {
            provider: function () {
                return new HDWalletProvider(
                    MNEMONIC,
                    `https://ropsten.infura.io/v3/${INFURA_API_KEY}`
                )
            },
            network_id: 3,
            gas: 4000000, // make sure this gas allocation isn't over 4M, which is the max
            networkCheckTimeout: 10000,
        },
    },
    compilers: {
        solc: {
            version: '0.8.14',
        },
    },
    plugins: ['truffle-plugin-stdjsonin'],
}
