class BaseError extends Error {
  constructor(message, { httpStatusCode, errorCode, data } = {}) {
    super(message)
    this.message = message
    this.details = { httpStatusCode, errorCode, data }
  }

  get data() {
    return this.details.data
  }

  get httpStatusCode() {
    return this.details.httpStatusCode
  }

  get errorCode() {
    return this.details.errorCode
  }
}

class ValidationError extends BaseError {
  constructor(validatorOutput) {
    super('Validation error', { httpStatusCode: 400, errorCode: -901, data: validatorOutput })
  }
}

class BinanceClientError extends BaseError {
  constructor(errorResponse) {
    super('Unhandled Binance client error', {
      httpStatusCode: 400,
      errorCode: -902,
      data: errorResponse,
    })
  }
}

module.exports = {
  ValidationError,
  BinanceClientError,
}
