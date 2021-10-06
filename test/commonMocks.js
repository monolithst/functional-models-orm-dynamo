const sinon = require('sinon')

const createAwsMocks = () => {
  const get = sinon.stub().returns({ promise: Promise.resolve() })
  const put = sinon.stub().returns({ promise: Promise.resolve() })
  const deleteObj = sinon.stub().returns({ promise: Promise.resolve() })
  const constructor = sinon.stub().returns({ promise: Promise.resolve() })

  class DocumentClient {
    constructor(...args) {
      constructor(...args)
    }
    get(...args) {
      return get(...args)
    }
    put(...args) {
      return put(...args)
    }
    delete(...args) {
      return deleteObj(...args)
    }
  }
  DocumentClient.constructor = constructor
  DocumentClient.get = get
  DocumentClient.put = put
  DocumentClient.delete = deleteObj

  const dynamoConstructor = sinon.stub()
  const scan = sinon.stub()
  class DynamoDB {
    constructor(...args) {
      dynamoConstructor(...args)
    }

    scan(...args) {
      return scan(...args)
    }
  }
  DynamoDB.theConstructor = dynamoConstructor
  DynamoDB.DocumentClient = DocumentClient
  DynamoDB.scan = scan
  const AWS = {
    DynamoDB,
  }
  return AWS
}

const createDynamoClient = () => {
  const get = sinon.stub().resolves({})
  const update = sinon.stub().resolves({})
  const deleteObj = sinon.stub().resolves({})
  const client = () => {
    return {
      delete: deleteObj,
      get,
      update,
    }
  }
  client.get = get
  client.update = update
  client.delete = deleteObj
  return client
}

module.exports = {
  createAwsMocks,
  createDynamoClient,
}
