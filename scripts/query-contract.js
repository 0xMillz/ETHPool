require('dotenv').config()
const Web3 = require('web3')
const ABI = require('../public/contracts/Rewards.json').abi

const { INFURA_API_KEY } = process.env
const provider = `https://ropsten.infura.io/v3/${INFURA_API_KEY}`
const Web3Client = new Web3(new Web3.providers.HttpProvider(provider))
const deployedRopstenContractAddress =
    '0xE624D2d9Da2B5012352286911bb7F17c2F64F304'

const getTotalDeposits = async (contractAddress) => {
    const contract = new Web3Client.eth.Contract(ABI, contractAddress)
    const result = await contract.methods.totalDeposits().call()
    const ethAmount = Web3Client.utils.fromWei(result)

    console.log(
        `Rewards contract at Ropsten address ${contractAddress} has a balance of ${ethAmount} ETH`
    )
}

void getTotalDeposits(process.argv[2] || deployedRopstenContractAddress)
