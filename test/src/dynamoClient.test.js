const assert = require('chai').assert
const sinon = require('sinon')
const proxyquire = require('proxyquire')
const { createAwsMocks } = require('../commonMocks')

const setupMocks = () => {
  const AWS = createAwsMocks()
  const dynamoClient = proxyquire('../../src/dynamoClient', {
    ['aws-sdk']: AWS,
  })
  return {
    dynamoClient,
    AWS,
  }
}

describe('/src/dynamoClient.js', () => {
  describe('#()', () => {
    it('should call new DynamoDB() with correct params', () => {
      const { dynamoClient, AWS } = setupMocks()
      const input = { tableName: '', dynamoOptions: { passed: 'in' } }
      const instance = dynamoClient(input)
      const actual = AWS.DynamoDB.theConstructor.getCall(0).args[0]
      const expected = { passed: 'in' }
      assert.deepEqual(actual, expected)
    })
    it('should call new DocumentClient() with correct params', () => {
      const { dynamoClient, AWS } = setupMocks()
      const input = { tableName: '', dynamoOptions: { passed: 'in' } }
      const instance = dynamoClient(input)
      const actual = AWS.DynamoDB.DocumentClient.constructor.getCall(0).args[0]
      assert.isOk(actual.service)
    })
    describe('#get()', () => {
      it('should call documentClient.get() with the correct params', async () => {
        const { dynamoClient, AWS } = setupMocks()
        const input = { tableName: 'my-table', dynamoOptions: { passed: 'in' } }
        const instance = dynamoClient(input)
        AWS.DynamoDB.DocumentClient.get.returns({
          promise: () =>
            Promise.resolve().then(() => ({ Item: { my: 'result' } })),
        })
        await instance.get({ key: { id: 'my-key' } })
        const actual = AWS.DynamoDB.DocumentClient.get.getCall(0).args[0]
        const expected = { TableName: 'my-table', Key: { id: 'my-key' } }
        assert.deepEqual(actual, expected)
      })
      it('should return "Item" from documentClient.get() with the correct params', async () => {
        const { dynamoClient, AWS } = setupMocks()
        const input = { tableName: 'my-table', dynamoOptions: { passed: 'in' } }
        const instance = dynamoClient(input)
        AWS.DynamoDB.DocumentClient.get.returns({
          promise: () =>
            Promise.resolve().then(() => ({ Item: { my: 'result' } })),
        })
        const actual = await instance.get({ key: 'my-key' })
        const expected = { my: 'result' }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#update()', () => {
      it('should return "Item" from documentClient.put() with the correct params', async () => {
        const { dynamoClient, AWS } = setupMocks()
        const input = { tableName: 'my-table', dynamoOptions: { passed: 'in' } }
        const instance = dynamoClient(input)
        AWS.DynamoDB.DocumentClient.put.returns({
          promise: () => Promise.resolve(),
        })
        await instance.update({
          item: { myarg: 'here', id: 'bad-id' },
          key: { id: 'my-key' },
        })
        const actual = AWS.DynamoDB.DocumentClient.put.getCall(0).args[0]
        const expected = {
          TableName: 'my-table',
          Item: { myarg: 'here', id: 'my-key' },
        }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#delete()', () => {
      it('should return "Item" from documentClient.delete() with the correct params', async () => {
        const { dynamoClient, AWS } = setupMocks()
        const input = { tableName: 'my-table', dynamoOptions: { passed: 'in' } }
        const instance = dynamoClient(input)
        AWS.DynamoDB.DocumentClient.delete.returns({
          promise: () => Promise.resolve(),
        })
        await instance.delete({ key: { id: 'my-key' } })
        const actual = AWS.DynamoDB.DocumentClient.delete.getCall(0).args[0]
        const expected = { TableName: 'my-table', Key: { id: 'my-key' } }
        assert.deepEqual(actual, expected)
      })
    })
  })
})
