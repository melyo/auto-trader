require('dotenv').config()
const WebSocket = require('ws')

const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@miniTicker')

ws.on('message', function incoming(data) {
  console.log(data)
})
