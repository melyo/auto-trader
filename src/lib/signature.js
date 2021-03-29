const crypto = require('crypto')
const querystring = require('querystring')

const { BINANCE_API_SECRET } = process.env

function generate(params = {}) {
  const now = new Date()
  const timestamp = now.getTime()
  const queryParams = querystring.stringify({ ...params, timestamp })
  const signature = crypto
    .createHmac('sha256', BINANCE_API_SECRET)
    .update(queryParams)
    .digest('hex')
  return `${queryParams}&signature=${signature}`
}

module.exports = { generate }
