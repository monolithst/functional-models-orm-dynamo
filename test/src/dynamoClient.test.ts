import { assert } from 'chai'
import sinon from 'sinon'
import { createAwsMocks } from '../commonMocks'
import dynamoClient from '../../src/dynamoClient'

const setupMocks = () => {
  const AWS = createAwsMocks()
  return {
    AWS,
  }
}

describe('/src/dynamoClient.ts', function() {
  describe('#()', () => {
    it('should call new DynamoDB() with correct params', function() {
      const { AWS } = setupMocks()
      const input = { AWS, tableName: '', dynamoOptions: { passed: 'in' } }
      const instance = dynamoClient(input)
      // @ts-ignore
      const actual = AWS.DynamoDB.theConstructor.getCall(0).args[0]
      const expected = { passed: 'in' }
      assert.deepEqual(actual, expected)
    })
    it('should call new DocumentClient() with correct params', () => {
      const { AWS } = setupMocks()
      const input = { AWS, tableName: '', dynamoOptions: { passed: 'in' } }
      const instance = dynamoClient(input)
      // @ts-ignore
      const actual = AWS.DynamoDB.DocumentClient.constructor.getCall(0).args[0]
      assert.isOk(actual.service)
    })
    describe('#get()', () => {
      it('should call documentClient.get() with the correct params', async () => {
        const { AWS } = setupMocks()
        const input = { AWS, tableName: 'my-table', dynamoOptions: { passed: 'in' } }
        const instance = dynamoClient(input)
        // @ts-ignore
        AWS.DynamoDB.DocumentClient.get.returns({
          promise: () =>
            Promise.resolve().then(() => ({ Item: { my: 'result' } })),
        })
        await instance.get({ key: { id: 'my-key' } })
        // @ts-ignore
        const actual = AWS.DynamoDB.DocumentClient.get.getCall(0).args[0]
        const expected = { TableName: 'my-table', Key: { id: 'my-key' } }
        assert.deepEqual(actual, expected)
      })
      it('should return "Item" from documentClient.get() with the correct params', async () => {
        const { AWS } = setupMocks()
        const input = { AWS, tableName: 'my-table', dynamoOptions: { passed: 'in' } }
        const instance = dynamoClient(input)
        // @ts-ignore
        AWS.DynamoDB.DocumentClient.get.returns({
          promise: () =>
            Promise.resolve().then(() => ({ Item: { my: 'result' } })),
        })
        const actual = await instance.get({ key: { key: 'my-key' } })
        const expected = { my: 'result' }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#update()', () => {
      it('should return "Item" from documentClient.put() with the correct params', async () => {
        const { AWS } = setupMocks()
        const input = { AWS, tableName: 'my-table', dynamoOptions: { passed: 'in' } }
        const instance = dynamoClient(input)
        // @ts-ignore
        AWS.DynamoDB.DocumentClient.put.returns({
          promise: () => Promise.resolve(),
        })
        await instance.update({
          item: { myarg: 'here', id: 'bad-id' },
          key: { id: 'my-key' },
        })
        // @ts-ignore
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
        const { AWS } = setupMocks()
        const input = { AWS, tableName: 'my-table', dynamoOptions: { passed: 'in' } }
        const instance = dynamoClient(input)
        // @ts-ignore
        AWS.DynamoDB.DocumentClient.delete.returns({
          promise: () => Promise.resolve(),
        })
        await instance.delete({ key: { id: 'my-key' } })
        // @ts-ignore
        const actual = AWS.DynamoDB.DocumentClient.delete.getCall(0).args[0]
        const expected = { TableName: 'my-table', Key: { id: 'my-key' } }
        assert.deepEqual(actual, expected)
      })
    })
  })
})
