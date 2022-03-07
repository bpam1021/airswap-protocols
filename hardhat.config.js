require('dotenv').config({ path: '../../.env' })
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-etherscan')
require('solidity-coverage')

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY,
      gasPrice: 10e9,
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/' + process.env.INFURA_API_KEY,
      gasPrice: 50e9,
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
    },
    bsctestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      gasPrice: 10e9,
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      gasPrice: 10e9,
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
    },
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      gasPrice: 225e9,
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
    },
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      gasPrice: 30e9,
      accounts: {
        mnemonic: process.env.MNEMONIC || '',
      },
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.7',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.MAINNET_API_KEY,
      rinkeby: process.env.RINKEBY_API_KEY,
      bsc: process.env.BSC_API_KEY,
      bscTestnet: process.env.BSCTESTNET_API_KEY,
      avalanche: process.env.AVALANCHE_API_KEY,
      avalancheFujiTestnet: process.env.FUJI_API_KEY,
    },
  },
  paths: {
    artifacts: './build',
  },
}