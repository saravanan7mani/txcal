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

async function calculate(blocknumber) {
  try {
    const response = await axios.get(url + '/block-height' + blocknumber);
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}

