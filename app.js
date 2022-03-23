const axios = require('axios').default;
const PriorityQueue = require('priorityqueuejs');

const url = 'https://blockstream.info/api'
const block_number = 680000;

calculate(block_number)

async function calculate(blocknumber) {
  try {
    const block_hash = await getBlockHash(blocknumber);
    const tx_count = await getTxCount(block_hash);
    const txid_map = await populateMap(block_hash, tx_count);

    process(txid_map);

  } catch (error) {
    console.log('Error while processing for block number ' + blocknumber + ', error: ' + error)
  }
}

async function getBlockHash(blocknumber) {
  if (!Number.isSafeInteger(blocknumber)) {
    throw new Error ('Invalid block number ' + blocknumber)
  }
  const block_height_response = await axios.get(url + '/block-height/' + blocknumber);

  if (block_height_response.status !== 200) {
    throw new Error ('Invalid http status code for get block hash request ' + block_height_response.status)
  }

  if (block_height_response.data == null) {
    throw new Error ('Invalid response from get block hash request for block number ' + blocknumber)
  }

  return block_height_response.data;
}

async function getTxCount(block_hash) {
  const block_response = await axios.get(url + '/block/' + block_hash);

  if (block_response.status !== 200) {
    throw new Error ('Invalid http status code for get tx count request ' + block_response.status)
  }

  if (block_response.data == null || block_response.data.tx_count == null) {
    throw new Error ('Invalid response from get tx count request for block hash ' + block_hash)
  }

  return block_response.data.tx_count
}

async function populateMap(block_hash, tx_count) {
  const loop_count = (~~(tx_count / 25)) + ((tx_count % 25) ? 1 : 0);

  const txid_map = new Map();

  for (let i = 0; i < loop_count; i++) {
    const txs_data = await getTxs(block_hash, i);
    
    txs_data.forEach(function(txid) { 
      if (txid.txid === 'dacfabc4806537828b243eb9aee20a467018b35ce4a0a2d83bd6c7c1cf940f23') {
        txid.txid = txid.txid;
        console.log(txid.vin.length);
      }
      const vin_txid_set = new Set();

      const txid_info = {vin_txids: [], ansc_count: 0, visited: false};
      txid_map.set(txid.txid, txid_info)
      txid.vin.forEach(function(vin_txid) {
        vin_txid_set.add(vin_txid.txid);
      });
      txid_info.vin_txids = [...vin_txid_set];
    });
  }

  return txid_map;
}

async function getTxs(block_hash, i) {
  const txs_response = await axios.get(url + '/block/' + block_hash + '/txs/' + i * 25);

  if (txs_response.status !== 200) {
    throw new Error ('Invalid http status code for get txs request ' + txs_response.status)
  }

  if (txs_response.data == null) {
    throw new Error ('Invalid response from get txs request for block hash ' + block_hash + ', start_index ' + i)
  }

  return txs_response.data;
}

function process(txid_map) {
  const queue = new PriorityQueue((a, b) => {
    return b.tx_size - a.tx_size;
  });

  txid_map.forEach((txid_info, txid) => {
    if (txid === 'dacfabc4806537828b243eb9aee20a467018b35ce4a0a2d83bd6c7c1cf940f23') {
      txid = txid;
    }
    const txsize = calcAnscSize(txid, txid_map);
    if (queue.size() < 10) {
      queue.enq({tx_size: txsize, tx_id: txid});
    }
    else {
      if (queue.peek().tx_size < txsize) {
        queue.deq();
        queue.enq({tx_size: txsize, tx_id: txid});
      }
    }
  })

  const largest_txs = [];
  while (!queue.isEmpty()) {
    largest_txs.push(queue.deq());
  }

  largest_txs.sort((a, b) => {
    return b.tx_size - a.tx_size;
  });

  for (let i = 0; i < largest_txs.length; i++) {
    console.log(largest_txs[i].tx_id + ' ' + largest_txs[i].tx_size)
  }
}

function calcAnscSize(txid, txid_map) {
  if (txid_map.has(txid)) {
    const txid_info = txid_map.get(txid);
    if (txid_info.visited) {
      return txid_info.ansc_count + 1;
    }

    let ansc_count = 0;

    txid_info.vin_txids.forEach((vin_txid) => {
      ansc_count += (calcAnscSize(vin_txid, txid_map));
    });

    txid_info.visited = true;
    txid_info.ansc_count = ansc_count;

    return ansc_count;
  }
  else {
    return 0;
  }
}