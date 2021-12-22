import { DEBUG } from '../../../config';

const WEBSOCKET_URL = DEBUG
  ? 'http://localhost:3000/ws'
  : 'http://immedia.herokuapp.com/ws';
// const WEBSOCKET_URL = "http://immedia.herokuapp.com/ws";

// String pre-attached to console.log messages
const INIT = 'IMMEDIA: ';

const GC_RATE = 1500; // 1.5 seconds
const REMOVE_THRESHOLD = 1000 * 20; // 20 seconds
const SNAPSHOT_RATE = 500; // 0.5 seconds
const PING_RATE = 1000 * 5; // 5 seconds
const UPDATE_RATE = 1000 * 5; // 1 second

export { WEBSOCKET_URL };
export { INIT };
export {
  GC_RATE, REMOVE_THRESHOLD, SNAPSHOT_RATE, PING_RATE, UPDATE_RATE,
};
