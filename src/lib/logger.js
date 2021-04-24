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
  const ticker = {
    Date: new Date().toISOString(),
    Symbol: order.symbol,
    Price: toDecimal(parseFloat(cryptoCurrency.price)),
    'Trade Padding': TRADE_PADDING,
  }
  const crypto = {
    Crypto: trade.asset,
    'Crypto Wallet': toDecimal(parseFloat(trade.free)),
    'Crypto Locked Wallet': toDecimal(parseFloat(trade.locked)),
  }
  const source = {
    Source: funds.asset,
    'Source Funds': toDecimal(parseFloat(funds.free)),
    'Source Locked Funds': toDecimal(parseFloat(funds.locked)),
  }
  const orderTime = order.time || order.transactTime
  const action = {
    Action: order.isExisting ? 'NONE' : order.side,
    'Buy Price': toDecimal(order.side === 'BUY' ? order.price : 0),
    'Sell Price': toDecimal(order.side === 'SELL' ? order.price : 0),
    Quantity: toDecimal(order.origQty || 0),
    'Order ID': order.orderId,
    'Last Trade': orderTime ? new Date(orderTime).toISOString() : 'NONE',
  }
  const data = {
    ...ticker,
    ...crypto,
    ...source,
    ...action,
  }

  console.log('>>', JSON.stringify(ticker))
  console.log(JSON.stringify(crypto))
  console.log(JSON.stringify(source))
  console.log(JSON.stringify(action))

  csvLog('./logs/events', 'event', data)
  if (!order.isExisting) {
    csvLog('./logs/transactions', 'transaction', data)
  }
}
