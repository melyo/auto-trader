const fs = require('fs')

const { TRADE_PRECISION, TRADE_PADDING } = process.env

const to8Decimal = (value) => (typeof value === 'string' ? value : value.toFixed(TRADE_PRECISION))

const getDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

module.exports = function log(cryptoCurrency, trade, funds, order = {}) {
  const log = {
    Date: new Date().toISOString(),
    Action: order.isExisting ? 'NONE' : order.side,
    'Buy Price': order.side === 'BUY' ? to8Decimal(order.price) : '0',
    'Sell Price': order.side === 'SELL' ? to8Decimal(order.price) : '0',
    Padding: TRADE_PADDING,
    Crypto: trade.asset,
    'Crypto Price': to8Decimal(parseFloat(cryptoCurrency.price)),
    'Crypto Wallet': to8Decimal(parseFloat(trade.free)),
    'Crypto Locked Wallet': to8Decimal(parseFloat(trade.locked)),
    Source: funds.asset,
    'Source Funds': to8Decimal(parseFloat(funds.free)),
    'Source Locked Funds': to8Decimal(parseFloat(funds.locked)),
  }

  console.log(`>>${JSON.stringify(log)}`)

  const files = fs.readdirSync('./logs/transaction')
  const filename = `binance-txn-${getDate()}.csv`

  if (files.find((item) => item === filename)) {
    fs.appendFileSync(`./logs/transaction/${filename}`, `\n${Object.values(log).join(',')}`)
  } else {
    fs.writeFileSync(
      `./logs/transaction/${filename}`,
      `${Object.keys(log).join(',')}\n${Object.values(log).join(',')}`,
    )
  }
}
