const WEBSOCKET_URL = process.env.APP_ENV === 'production'
  ? 'http://immedia.herokuapp.com/ws'
  : 'http://localhost:3000/ws';

// String pre-attached to console.log messages
const INIT = 'IMMEDIA: ';

const GC_RATE = 1500; // 1.5 seconds
const REMOVE_THRESHOLD = 1000 * 20; // 20 seconds
const SNAPSHOT_RATE = 500; // 0.5 seconds
const PING_RATE = 1000 * 5; // 5 seconds
const UPDATE_RATE = 1000 * 1; // 1 second

export { WEBSOCKET_URL };
export { INIT };
export {
  GC_RATE, REMOVE_THRESHOLD, SNAPSHOT_RATE, PING_RATE, UPDATE_RATE,
};
