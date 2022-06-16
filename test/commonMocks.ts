import sinon from 'sinon'

const createAwsMocks = () => {
  const get = sinon.stub().returns({ promise: () => Promise.resolve() })
  const put = sinon.stub().returns({ promise: () => Promise.resolve() })
  const deleteObj = sinon.stub().returns({ promise: () => Promise.resolve() })
  const constructor = sinon.stub().returns({ promise: () => Promise.resolve() })

  class DocumentClient {
    public constructor(...args: any[]) {
      constructor(...args)
    }
    get(...args: any[]) {
      return get(...args)
    }
    put(...args: any[]) {
      return put(...args)
    }
    delete(...args: any[]) {
      return deleteObj(...args)
    }
  }

  // @ts-ignore
  DocumentClient.constructor = constructor
  // @ts-ignore
  DocumentClient.get = get
  // @ts-ignore
  DocumentClient.put = put
  // @ts-ignore
  DocumentClient.delete = deleteObj

  const dynamoConstructor = sinon.stub()
  const scan = sinon.stub()
  class DynamoDB {
    public constructor(...args: any[]) {
      dynamoConstructor(...args)
    }

    public scan(...args: any[]) {
      return scan(...args)
    }
  }
  // @ts-ignore
  DynamoDB.theConstructor = dynamoConstructor
  // @ts-ignore
  DynamoDB.DocumentClient = DocumentClient
  // @ts-ignore
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

export {
  createAwsMocks,
  createDynamoClient,
}
