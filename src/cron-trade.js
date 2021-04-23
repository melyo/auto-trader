const binanceClient = require('./lib/binance')
const logger = require('./lib/logger')

const { CRYPTO_SYMBOL, SOURCE_SYMBOL, TRADE_MIN_LOT, TRADE_PADDING, TRADE_PRECISION } = process.env

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

const placeBuyOrder = (currentPrice, availableSource) => {
  const price = currentPrice + tradePadding
  const quantityByMinLot = Math.floor(availableSource / price / tradeMinLot)
  const quantity = (quantityByMinLot * tradeMinLot).toFixed(TRADE_PRECISION)
  return binanceClient.createOrder('BUY', price, quantity)
}

const placeSellOrder = (currentPrice, availableCrypto) => {
  const quantityByMinLot = Math.floor(availableCrypto / tradeMinLot)
  const quantity = (quantityByMinLot * tradeMinLot).toFixed(TRADE_PRECISION)
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

const placeOrder = async (cryptoPrice, cryptoBalance, sourceBalance) => {
  // TODO: exit if there is an ongoing transaction
  if (cryptoBalance.free < tradeMinLot && cryptoBalance.locked === 0) {
    return placeBuyOrder(cryptoPrice, sourceBalance.free)
  } else if (cryptoBalance.free >= tradeMinLot && cryptoBalance.locked === 0) {
    return placeSellOrder(cryptoPrice, cryptoBalance.free)
  } else {
    return checkExistingOrder(cryptoPrice)
  }
}

module.exports = async function process() {
  try {
    const crypto = await binanceClient.getPrice()
    const cryptoPrice = parseFloat(crypto.price)

    const account = await binanceClient.getAccount()
    const cryptoBalance = getBalance(account, CRYPTO_SYMBOL)
    const sourceBalance = getBalance(account, SOURCE_SYMBOL)

    const order = await placeOrder(cryptoPrice, cryptoBalance, sourceBalance)

    logger(crypto, cryptoBalance, sourceBalance, order)
  } catch (error) {
    console.log(error)
    console.log('Error:', JSON.stringify(error.details, null, 2))
  }
}
