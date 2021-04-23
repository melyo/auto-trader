const fs = require('fs')

const { TRADE_PRECISION, TRADE_PADDING } = process.env

const toDecimal = (value) => (typeof value === 'string' ? value : value.toFixed(TRADE_PRECISION))

const getDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

const csvLog = (path, prefix, data) => {
  const files = fs.readdirSync(path)
  const filename = `${prefix}-${getDate()}.csv`
  if (files.find((item) => item === filename)) {
    fs.appendFileSync(`${path}/${filename}`, `\n${Object.values(data).join(',')}`)
  } else {
    fs.writeFileSync(
      `${path}/${filename}`,
      `${Object.keys(data).join(',')}\n${Object.values(data).join(',')}`,
    )
  }
}

module.exports = function log(cryptoCurrency, trade, funds, order = {}) {
  const data = {
    Date: new Date().toISOString(),
    Action: order.isExisting ? 'NONE' : order.side,
    Padding: TRADE_PADDING,
    'Buy Price': order.side === 'BUY' ? toDecimal(order.price) : '0',
    'Sell Price': order.side === 'SELL' ? toDecimal(order.price) : '0',
    'Last Order Date': new Date(order.time).toISOString() || 'NONE',
    Crypto: trade.asset,
    'Crypto Price': toDecimal(parseFloat(cryptoCurrency.price)),
    'Crypto Wallet': toDecimal(parseFloat(trade.free)),
    'Crypto Locked Wallet': toDecimal(parseFloat(trade.locked)),
    Source: funds.asset,
    'Source Funds': toDecimal(parseFloat(funds.free)),
    'Source Locked Funds': toDecimal(parseFloat(funds.locked)),
  }

  console.log(`>>${JSON.stringify(data)}`)
  csvLog('./logs/events', 'event', data)

  if (!order.isExisting) {
    csvLog('./logs/transactions', 'transaction', data)
  }
}
