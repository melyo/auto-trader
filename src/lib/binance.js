const axios = require('axios')
const { BinanceClientError } = require('./error')
const signature = require('./signature')

const { BINANCE_API_URL, BINANCE_API_KEY, CRYPTO_SYMBOL, SOURCE_SYMBOL } = process.env

const client = axios.create({
  baseURL: BINANCE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const handleError = (error) => {
  if (error.response) {
    const { status, data = {} } = error.response
    throw new BinanceClientError({ status, response: data })
  } else if (error.request) {
    throw new BinanceClientError({ message: 'Empty response from Binance client' })
  } else {
    throw new BinanceClientError({ message: 'Unable to connect to Binance client' })
  }
}

const handleRequest = async (request) => {
  try {
    const { data = {} } = await request
    return data
  } catch (error) {
    handleError(error)
  }
}

function getPrice() {
  const params = { symbol: `${CRYPTO_SYMBOL}${SOURCE_SYMBOL}` }
  const request = client.get('/api/v3/ticker/price', { params })
  return handleRequest(request)
}

function getAccount() {
  const params = signature.generate()
  const headers = { 'X-MBX-APIKEY': BINANCE_API_KEY }
  const request = client.get(`/api/v3/account?${params}`, { headers })
  return handleRequest(request)
}

function getOpenOrders() {
  const params = signature.generate({ symbol: `${CRYPTO_SYMBOL}${SOURCE_SYMBOL}` })
  const headers = { 'X-MBX-APIKEY': BINANCE_API_KEY }
  const request = client.get(`/api/v3/openOrders?${params}`, { headers })
  return handleRequest(request)
}

function testOrder(side, price, quantity) {
  const params = signature.generate({
    symbol: `${CRYPTO_SYMBOL}${SOURCE_SYMBOL}`,
    type: 'LIMIT',
    timeInForce: 'GTC',
    side,
    price,
    quantity,
  })
  const headers = { 'X-MBX-APIKEY': BINANCE_API_KEY }
  const request = client.post(`/api/v3/order/test?${params}`, null, { headers })
  return handleRequest(request)
}

function createOrder(side, price, quantity) {
  const params = signature.generate({
    symbol: `${CRYPTO_SYMBOL}${SOURCE_SYMBOL}`,
    type: 'LIMIT',
    timeInForce: 'GTC',
    price: String(price),
    quantity,
    side,
  })
  const headers = { 'X-MBX-APIKEY': BINANCE_API_KEY }
  const request = client.post(`/api/v3/order?${params}`, null, { headers })
  return handleRequest(request)
}

function cancelOrder(orderId) {
  const params = signature.generate({ symbol: `${CRYPTO_SYMBOL}${SOURCE_SYMBOL}`, orderId })
  const headers = { 'X-MBX-APIKEY': BINANCE_API_KEY }
  const request = client.delete(`/api/v3/order?${params}`, { headers })
  return handleRequest(request)
}

module.exports = {
  getPrice,
  getAccount,
  getOpenOrders,
  testOrder,
  createOrder,
  cancelOrder,
}
