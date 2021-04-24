const binanceClient = require('./lib/binance')
const logger = require('./lib/logger')

const {
  CRYPTO_SYMBOL,
  SOURCE_SYMBOL,
  TRADE_MIN_NOTIONAL,
  TRADE_MIN_LOT,
  TRADE_PADDING,
  TRADE_PRECISION,
} = process.env

const tradePadding = parseFloat(TRADE_PADDING)
const tradeMinLot = parseFloat(TRADE_MIN_LOT)
const tradeMinNominal = parseFloat(TRADE_MIN_NOTIONAL)

const getBalance = async (asset, account = {}) => {
  let balances = account.balances
  if (!balances) {
    const acc = await binanceClient.getAccount()
    balances = acc.balances
  }

  const balance = balances.find((item) => item.asset === asset)
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

const createOrder = async (side, price, quantity) => {
  const order = await binanceClient.createOrder(side, price, quantity)
  return { ...order, side, price, origQty: quantity }
}

const placeBuyOrder = (currentPrice, availableSource) => {
  const price = (currentPrice + tradePadding).toFixed(TRADE_PRECISION)
  const quantityByMinLot = Math.floor(availableSource / price / tradeMinLot)
  const quantity = (quantityByMinLot * tradeMinLot).toFixed(TRADE_PRECISION)
  return createOrder('BUY', price, quantity)
}

const placeSellOrder = (currentPrice, availableCrypto) => {
  const quantityByMinLot = Math.floor(availableCrypto / tradeMinLot)
  const quantity = (quantityByMinLot * tradeMinLot).toFixed(TRADE_PRECISION)
  const price = (currentPrice - tradePadding).toFixed(TRADE_PRECISION)
  return createOrder('SELL', price, quantity)
}

const getOrder = async () => {
  // TODO: validate open orders. should only contain one
  const openOrders = await binanceClient.getOpenOrders()
  const order = openOrders[0]
  return order ? { ...order, isExisting: true } : { price: 0 }
}

const placeOrder = async (cryptoPrice, cryptoBalance, sourceBalance) => {
  // TODO: exit if there is an ongoing transaction
  const order = await getOrder()
  if (order.isExisting) {
    //
    console.log({
      side: order.side,
      crypto: cryptoPrice,
      toComp: parseFloat(order.price) - tradePadding,
      cond: cryptoPrice < parseFloat(order.price) - tradePadding,
    })
    //
    if (order.side === 'SELL' && cryptoPrice > parseFloat(order.price) + tradePadding) {
      await binanceClient.cancelOrder(order.orderId)
      const newCryptoBalance = await getBalance(CRYPTO_SYMBOL)
      return placeSellOrder(cryptoPrice, newCryptoBalance.free)
    } else if (order.side === 'BUY' && cryptoPrice < parseFloat(order.price) - tradePadding) {
      await binanceClient.cancelOrder(order.orderId)
      const newSourceBalance = await getBalance(SOURCE_SYMBOL)
      return placeBuyOrder(cryptoPrice, newSourceBalance.free)
    }
  } else {
    if (cryptoBalance.free < tradeMinNominal && cryptoBalance.locked === 0) {
      return placeBuyOrder(cryptoPrice, sourceBalance.free)
    } else if (cryptoBalance.free >= tradeMinNominal && cryptoBalance.locked === 0) {
      return placeSellOrder(cryptoPrice, cryptoBalance.free)
    }
  }
  return order
}

module.exports = async function process() {
  try {
    const crypto = await binanceClient.getPrice()
    const cryptoPrice = parseFloat(crypto.price)

    const account = await binanceClient.getAccount()
    const cryptoBalance = await getBalance(CRYPTO_SYMBOL, account)
    const sourceBalance = await getBalance(SOURCE_SYMBOL, account)

    const order = await placeOrder(cryptoPrice, cryptoBalance, sourceBalance)

    logger(crypto, cryptoBalance, sourceBalance, order)
  } catch (error) {
    console.log(error)
    console.log('Error:', JSON.stringify(error.details, null, 2))
  }
}
