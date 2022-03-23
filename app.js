const axios = require('axios').default;

// https://blockstream.info/api/tx/91267afe223b17aa5f895193a696fc8211ed7b03190eae43795d1cf7b4d0ad4f

/** 
 * 
 * 1. GET /block-height/680000 -> 000000000000000000076c036ff5119e5a5a74df77abf64203473364509f7732
 * 2. GET /block/000000000000000000076c036ff5119e5a5a74df77abf64203473364509f7732 -> txcount
 * 3. Loop /block/000000000000000000076c036ff5119e5a5a74df77abf64203473364509f7732/txs/:index for (txcount / 25) times
 * 3.1. Store txid --> vins-txids (txids alone) (and count as undefined) to txidMap
 * 4. Loop txidMap
 * 4.1 Check vin-txid of vin-txids presence in txidMap as txid
 * 4.2 If exists, increase count value of current txid by count value of vin-txid if its presence in txid, else increase by 1. Recursion till same bloc
*/

const url = 'https://blockstream.info/api'

calculate(680000)

async function calculate(blocknumber) {
  try {
    const block_height_response = await axios.get(url + '/block-height/' + blocknumber);

    if (block_height_response.status !== 200) {
      throw new Error ('Invalid http status code ' + block_height_response.status)
    }

    if (block_height_response.data == null) {
      throw new Error ('Invalid input block number code ' + blocknumber)
    }

    const block_hash = block_height_response.data;

    const block_response = await axios.get(url + '/block/' + block_hash);

    if (block_response.status !== 200) {
      throw new Error ('Invalid http status code ' + block_response.status)
    }

    if (block_response.data == null || block_response.data.tx_count == null) {
      throw new Error ('Invalid block hash ' + block_response)
    }

    const tx_count = block_response.data.tx_count
    
    const loop_count = ~~(tx_count / 25) + (tx_count % 25) ? 1 : 0;

    const txid_map = new Map();

    for (let i = 0; i < loop_count; i++) {
      const txs_response = await axios.get(url + '/block/' + block_hash + '/txs/' + i * 25);

      if (txs_response.status !== 200) {
        throw new Error ('Invalid http status code ' + txs_response.status)
      }

      if (txs_response.data == null) {
        throw new Error ('Invalid txs response for ' + txs_response)
      }

      const txs_data = txs_response.data;

      txs_data.forEach(function(txid) { 
        // console.log('txid' + txid.txid);
        const txid_info = {vin_txids: [], ansc_count: 0};
        txid_map.set(txid.txid, txid_info)
        txid.vin.forEach(function(vin_txid) {
          // console.log('txid ' + txid.txid +  ', vin_txid ' + vin_txid.txid);
          txid_info.vin_txids.push(vin_txid.txid);
        });
      });
    }

    console.log(txid_map.size);



  } catch (error) {
    console.error('Error - ' + error);
  }
}

function loop(txid_map) {
  
}

