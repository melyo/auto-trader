const { TRADE_PADDING } = process.env

const to8Decimal = (value) => (typeof value === 'string' ? value : value.toFixed(8))

module.exports = function log(cryptoCurrency, trade, funds, order = {}) {
  const log = {
    action: order.isExisting ? 'NONE' : order.side,
    buyOrder: order.side === 'BUY' ? to8Decimal(order.price) : '0',
    sellOrder: order.side === 'SELL' ? to8Decimal(order.price) : '0',
    price: cryptoCurrency.price,
    wallet: to8Decimal(parseFloat(trade.free) + parseFloat(trade.locked)),
    funds: to8Decimal(parseFloat(funds.free) + parseFloat(funds.locked)),
    padding: TRADE_PADDING,
  }
  console.log(JSON.stringify(log))
}
