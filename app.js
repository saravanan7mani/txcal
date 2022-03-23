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
const block_number = 680000;

calculate(block_number)

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
        const txid_info = {vin_txids: [], ansc_count: 0, visited: false};
        txid_map.set(txid.txid, txid_info)
        txid.vin.forEach(function(vin_txid) {
          // console.log('txid ' + txid.txid +  ', vin_txid ' + vin_txid.txid);
          txid_info.vin_txids.push(vin_txid.txid);
        });
      });
    }

    // console.log(txid_map.size);

    process(txid_map);

  } catch (error) {
    throw error;
    // console.error('Error - ' + error);
  }
}

function process(txid_map) {
  console.log('process ' + txid_map);
  const large_txs = [];
  txid_map.forEach((txid_info, txid) => {
    if (txid_info.visited) {
      return;
    }

    console.log('process 2 ' + txid_map);
    const txsize = calcAnscSize(txid, txid_map);
    large_txs.push( {tx_size: txsize, tx_id: txid});
    large_txs.sort((a, b) => {
      return b.tx_size - a.tx_size;
    });
  })

  for (let i = 0; i < 10; i++) {
    console.log('txid ' + large_txs[i].tx_id + ', size ' + large_txs[i].tx_size)
  }
}

function calcAnscSize(txid, txid_map) {
  console.log('calcAnscSize ' + txid_map);
  if (txid_map.has(txid)) {
    const txid_info = txid_map.get(txid);
    if (txid_info.visited) {
      return txid_info.ansc_count;
    }

    let ansc_count = 0;

    txid_info.vin_txids.forEach((vin_txid) => {
      ansc_count += (calcAnscSize(vin_txid, txid_map) + 1);
    });

    txid_info.visited = true;

    return ansc_count;
  }
  else {
    return 0;
  }
}

