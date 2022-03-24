const PriorityQueue = require('priorityqueuejs');

const {getBlockHash} = require('./block_explorer_service');
const {getTxCount} = require('./block_explorer_service');
const {getTxs} = require('./block_explorer_service');

const RATE_LIMIT = 100;

calculate()

async function calculate() {
  
  const blocknumber = process.env.BLOCK_NUMBER || 680000;

  try {
    const block_number = parseInt(blocknumber);
    if (!Number.isSafeInteger(block_number) || block_number < 0) {
      throw new Error ('Invalid block number ' + block_number)
    }

    const block_hash = await getBlockHash(block_number);
    const tx_count = await getTxCount(block_hash);
    const txid_map = await populateMap(block_hash, tx_count);

    doProcess(txid_map);

  } catch (error) {
    console.log('Error while processing for block number ' + blocknumber + ', error: ' + error)
  }
}

async function populateMap(block_hash, tx_count) {
  const loop_count = (~~(tx_count / 25)) + ((tx_count % 25) ? 1 : 0);

  const txid_map = new Map();
  const get_txs_promises = [];
  for (let i = 1; i <= loop_count; i++) {
    get_txs_promises.push(getTxs(block_hash, i-1));

    if (i%RATE_LIMIT === 0 || i === loop_count) {
      const txs_datas = await Promise.all(get_txs_promises);

      Promise.resolve(txs_datas).then((txs_datas) => {
        txs_datas.forEach((txs_data) => {
          txs_data.forEach(function(txid) {
            const vin_txid_set = new Set();
      
            const txid_info = {vin_txids: [], ansc_count: 0, visited: false};
            txid_map.set(txid.txid, txid_info)
            txid.vin.forEach(function(vin_txid) {
              vin_txid_set.add(vin_txid.txid);
            });
            txid_info.vin_txids = [...vin_txid_set];
          });
        })
      })
    }
  }

  return txid_map;
}

function doProcess(txid_map) {
  const topsize = process.env.TOP_SIZE || 10;

  const top_size = parseInt(topsize);
  if (!Number.isSafeInteger(top_size) || top_size <= 0) {
    throw new Error ('Invalid top size ' + top_size)
  }

  const queue = new PriorityQueue((a, b) => {
    return b.tx_size - a.tx_size;
  });

  txid_map.forEach((txid_info, txid) => {
    calcAnscSize(txid, txid_map);
    const txsize = txid_map.get(txid).ansc_count;
    if (queue.size() < top_size) {
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

    return ansc_count + 1;
  }
  else {
    return 0;
  }
}
