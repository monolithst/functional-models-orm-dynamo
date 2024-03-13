import sinon from 'sinon'

const createAws3MockClient = () => {
  const dynamoDbClient = sinon.stub()
  const sendSinon = sinon.stub().resolves({ Items: [] })
  class DynamoDBClient {
    constructor(...args: any) {
      dynamoDbClient(...args)
    }
    public send(...args: any) {
      return sendSinon(...args)
    }
    static sinon = dynamoDbClient
    static sendSinon = sendSinon
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

  return {
    DynamoDBClient,
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    DeleteCommand,
    ScanCommand,
  }
}

export { createAws3MockClient }
