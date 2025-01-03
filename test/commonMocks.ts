import sinon from 'sinon'

const createAws3MockClient = () => {
  const dynamoDbClient = {
    send: sinon.stub(),
  }

  const dynamoDbDocumentClientSend = sinon.stub().resolves({ Items: [] })
  const DynamoDBDocumentClient = {
    from: sinon.stub().returns({
      send: dynamoDbDocumentClientSend,
    }),
    sendSinon: dynamoDbDocumentClientSend,
  }
  const putCommand = sinon.stub()
  class PutCommand {
    constructor(...args: any) {
      putCommand(...args)
    }
    static sinon = putCommand
  }
  const getCommand = sinon.stub()
  class GetCommand {
    constructor(...args: any) {
      getCommand(...args)
    }
    static sinon = getCommand
  }
  const deleteCommand = sinon.stub()
  class DeleteCommand {
    constructor(...args: any) {
      deleteCommand(...args)
    }
    static sinon = deleteCommand
  }
  const scanCommand = sinon.stub()
  class ScanCommand {
    constructor(...args: any) {
      scanCommand(...args)
    }
    static sinon = scanCommand
  }

  const batchWriteCommand = sinon.stub()
  class BatchWriteCommand {
    constructor(...args: any) {
      batchWriteCommand(...args)
    }
    static sinon = batchWriteCommand
  }

  return {
    dynamoDbClient,
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    DeleteCommand,
    ScanCommand,
    BatchWriteCommand,
  }
}

export { createAws3MockClient }
