const axios = require('axios').default;

const URL = process.env.URL || 'https://blockstream.info/api';

async function getBlockHash(block_number) {
    const block_height_response = await axios.get(URL + '/block-height/' + block_number);
  
    if (block_height_response.status !== 200) {
      throw new Error ('Invalid http status code for get block hash request ' + block_height_response.status)
    }
  
    if (block_height_response.data == null) {
      throw new Error ('Invalid response from get block hash request for block number ' + block_number)
    }
  
    return block_height_response.data;
  }
  
async function getTxCount(block_hash) {
    const block_response = await axios.get(URL + '/block/' + block_hash);
  
    if (block_response.status !== 200) {
      throw new Error ('Invalid http status code for get tx count request ' + block_response.status)
    }
  
    if (block_response.data == null || block_response.data.tx_count == null) {
      throw new Error ('Invalid response from get tx count request for block hash ' + block_hash)
    }
  
    return block_response.data.tx_count
  }

async function getTxs(block_hash, i) {
    const txs_response = await axios.get(URL + '/block/' + block_hash + '/txs/' + i * 25);
  
    if (txs_response.status !== 200) {
      throw new Error ('Invalid http status code for get txs request ' + txs_response.status)
    }
  
    if (txs_response.data == null) {
      throw new Error ('Invalid response from get txs request for block hash ' + block_hash + ', start_index ' + i)
    }
  
    return txs_response.data;
  }

  module.exports = {
    getBlockHash,
    getTxCount,
    getTxs
  }