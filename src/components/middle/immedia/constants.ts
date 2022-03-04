const WEBSOCKET_URL = process.env.APP_ENV === 'production'
  ? 'https://immedia.herokuapp.com/ws'
  : 'http://localhost:3000/ws';

// String pre-attached to console.log messages
const INIT = 'IMMEDIA: ';

const WEBSOCKET_RECONNECTION_RATE = 1000 * 3; // 3 seconds
const GC_RATE = 1500; // 1.5 seconds
const REMOVE_THRESHOLD = 1000 * 20; // 20 seconds
const SNAPSHOT_RATE = 500; // 0.5 seconds
const PING_RATE = 1000 * 5; // 5 seconds
const UPDATE_RATE = 500 * 1; // 0.5 seconds

export { WEBSOCKET_URL };
export { INIT };
export {
  WEBSOCKET_RECONNECTION_RATE, GC_RATE, REMOVE_THRESHOLD, SNAPSHOT_RATE, PING_RATE, UPDATE_RATE,
};
