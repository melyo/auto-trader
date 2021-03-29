const binanceClient = require('./lib/binance')
const logger = require('./lib/logger')

const { CC_SYMBOL, EX_SYMBOL, TRADE_MIN_LOT, TRADE_PADDING } = process.env

const tradePadding = parseFloat(TRADE_PADDING)
const tradeMinLot = parseFloat(TRADE_MIN_LOT)

const getBalance = (account, asset) => {
  const balance = account.balances.find((item) => item.asset === asset)
  return balance
    ? {
        ...balance,
        free: parseFloat(balance.free),
        locked: parseFloat(balance.locked),
      }
    : {
        asset,
        free: 0,
        locked: 0,
      }
}

const placeBuyOrder = (currentPrice, availableFunds) => {
  const quantityByMinLot = Math.floor(availableFunds / currentPrice / tradeMinLot)
  const quantity = quantityByMinLot * tradeMinLot
  const price = currentPrice + tradePadding
  return binanceClient.createOrder('BUY', price, quantity)
}

const placeSellOrder = (currentPrice, availableCC) => {
  const quantityByMinLot = Math.floor(availableCC / tradeMinLot)
  const quantity = quantityByMinLot * tradeMinLot
  const price = currentPrice - tradePadding
  return binanceClient.createOrder('SELL', price, quantity)
}

const getOrder = async () => {
  // TODO: validate open orders. should only contain one
  const openOrders = await binanceClient.getOpenOrders()
  const order = openOrders[0]
  return order ? { ...order, isExisting: true } : { price: 0 }
}

const checkExistingOrder = async (currentPrice) => {
  const order = await getOrder()
  if (order.side === 'SELL' && currentPrice < parseFloat(order.price) + tradePadding) {
    const cancelled = await binanceClient.cancelOrder(order.orderId)
    const remaining = parseFloat(cancelled.origQty) - parseFloat(cancelled.executedQty)
    return placeSellOrder(currentPrice, remaining)
  } else if (order.side === 'BUY' && currentPrice < parseFloat(order.price) - tradePadding) {
    const cancelled = await binanceClient.cancelOrder(order.orderId)
    const remaining = parseFloat(cancelled.origQty) - parseFloat(cancelled.executedQty)
    return placeBuyOrder(currentPrice, remaining)
  }
  return order
}

const placeOrder = async (cPrice, ccBalance, exBalance) => {
  // TODO: exit if there is an ongoing transaction
  if (ccBalance.free < tradeMinLot && ccBalance.locked === 0) {
    return placeBuyOrder(cPrice, exBalance.free)
  } else if (ccBalance.free >= tradeMinLot && ccBalance.locked === 0) {
    return placeSellOrder(cPrice, ccBalance.free)
  } else {
    return checkExistingOrder(cPrice)
  }
}

module.exports = async function process() {
  try {
    const cc = await binanceClient.getPrice()
    const ccPrice = parseFloat(cc.price)

    const account = await binanceClient.getAccount()
    const ccBalance = getBalance(account, CC_SYMBOL)
    const exBalance = getBalance(account, EX_SYMBOL)

    const order = await placeOrder(ccPrice, ccBalance, exBalance)

    logger(cc, ccBalance, exBalance, order)
  } catch (error) {
    console.log(error)
    console.log('Error:', JSON.stringify(error.details, null, 2))
  }
}
