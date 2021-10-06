const assert = require('chai').assert
const sinon = require('sinon')
const proxyquire = require('proxyquire')
const { ormQueryBuilder } = require('functional-models-orm').ormQuery
const { createAwsMocks, createDynamoClient } = require('../commonMocks')

const createTestModel1 = ({ id, name }) => ({
  getId: () => id,
  getName: () => name,
  functions: {
    toObj: () => ({ id, name }),
    getPrimaryKey: () => id,
  },
  meta: {
    getModel: () => ({
      getName: () => 'TestModel1',
      getPrimaryKeyName: () => 'id',
    }),
  },
})

const createTestModel2 = ({ notId, name }) => ({
  getNotId: () => notId,
  getName: () => name,
  functions: {
    toObj: () => ({ notId, name }),
    getPrimaryKey: () => notId,
  },
  meta: {
    getModel: () => ({
      getName: () => 'TestModel1',
      getPrimaryKeyName: () => 'notId',
    }),
  },
})

const setupMocks = () => {
  const AWS = createAwsMocks()
  const dynamoClient = createDynamoClient()
  const datastoreProvider = proxyquire('../../src/datastoreProvider', {
    './dynamoClient': dynamoClient,
    'aws-sdk': AWS,
  })
  return {
    datastoreProvider,
    dynamoClient,
    AWS,
  }
}

const _createDynamoStringResult = (key, value) => {
  return {
    [key]: { S: value },
  }
}

const _createDynamoStingArrayResult = (key, values) => {
  return {
    [key]: { L: values.map(x => ({ S: x })) },
  }
}

const _createDynamoNullResult = key => {
  return {
    [key]: { NULL: true },
  }
}

describe('/src/datastoreProvider.js', () => {
  describe('#()', () => {
    it('should not throw an exception with basic arguments', () => {
      const { datastoreProvider } = setupMocks()
      assert.doesNotThrow(() => {
        const instance = datastoreProvider({})
      })
    })
    it('should have a "search" function', () => {
      const { datastoreProvider } = setupMocks()
      const instance = datastoreProvider({})
      assert.isFunction(instance.search)
    })
    it('should have a "retrieve" function', () => {
      const { datastoreProvider } = setupMocks()
      const instance = datastoreProvider({})
      assert.isFunction(instance.retrieve)
    })
    it('should have a "save" function', () => {
      const { datastoreProvider } = setupMocks()
      const instance = datastoreProvider({})
      assert.isFunction(instance.save)
    })
    it('should have a "delete" function', () => {
      const { datastoreProvider } = setupMocks()
      const instance = datastoreProvider({})
      assert.isFunction(instance.delete)
    })
    describe('#search()', () => {
      it('should call dynamo.scan once when LastEvaluatedKey is empty', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [],
              LastEvaluatedKey: null,
            })),
        })
        await instance.search(createTestModel1(obj).meta.getModel(), query)
        sinon.assert.calledOnce(AWS.DynamoDB.scan)
      })
      it('should be able to process a string value result', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [
                {
                  ..._createDynamoStringResult('id', 'my-id'),
                  ..._createDynamoStringResult('name', 'my-name'),
                },
              ],
              LastEvaluatedKey: null,
            })),
        })
        const actual = await instance.search(
          createTestModel1(obj).meta.getModel(),
          query
        )
        const expected = {
          instances: [{ id: 'my-id', name: 'my-name' }],
          page: null,
        }
        assert.deepEqual(actual, expected)
      })
      it('should be able to process a null value results', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', null).compile()
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [
                {
                  ..._createDynamoStringResult('id', 'my-id'),
                  ..._createDynamoNullResult('name'),
                },
              ],
              LastEvaluatedKey: null,
            })),
        })
        const actual = await instance.search(
          createTestModel1(obj).meta.getModel(),
          query
        )
        const expected = {
          instances: [{ id: 'my-id', name: null }],
          page: null,
        }
        assert.deepEqual(actual, expected)
      })
      it('should be able to process an array of strings', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('names', 'my-name').compile()
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [
                {
                  ..._createDynamoStringResult('id', 'my-id'),
                  ..._createDynamoStingArrayResult('names', ['a', 'b']),
                },
              ],
              LastEvaluatedKey: null,
            })),
        })
        const actual = await instance.search(
          createTestModel1(obj).meta.getModel(),
          query
        )
        const expected = {
          instances: [{ id: 'my-id', names: ['a', 'b'] }],
          page: null,
        }
        assert.deepEqual(actual, expected)
      })
      it('should return only 1 object if query has "take:1" even if there are two results from dynamo', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', null).take(1).compile()
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [
                {
                  ..._createDynamoStringResult('id', 'my-id'),
                  ..._createDynamoStringResult('name', 'name1'),
                },
                {
                  ..._createDynamoStringResult('id2', 'my-id'),
                  ..._createDynamoStringResult('name', 'name2'),
                },
              ],
              LastEvaluatedKey: null,
            })),
        })
        const actual = await instance.search(
          createTestModel1(obj).meta.getModel(),
          query
        )
        const expected = {
          instances: [{ id: 'my-id', name: 'name1' }],
          page: null,
        }
        assert.deepEqual(actual, expected)
      })
      it('should call dynamo.scan twice when LastEvaluatedKey is empty the second time', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [],
              LastEvaluatedKey: 'try-again',
            })),
        })
        AWS.DynamoDB.scan.onSecondCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [{ something: 'returned' }],
              LastEvaluatedKey: null,
            })),
        })
        await instance.search(createTestModel1(obj).meta.getModel(), query)
        sinon.assert.calledTwice(AWS.DynamoDB.scan)
      })
      it('should call dynamo.scan twice when LastEvaluatedKey has a value the second time but take:2 and 3 items are returned', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder()
          .property('name', 'my-name')
          .take(2)
          .compile()
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [],
              LastEvaluatedKey: 'try-again',
            })),
        })
        AWS.DynamoDB.scan.onSecondCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [
                { something: 'returned' },
                { something2: 'returned2' },
                { something3: 'returned3' },
              ],
              LastEvaluatedKey: 'another-value',
            })),
        })
        await instance.search(createTestModel1(obj).meta.getModel(), query)
        const actual = AWS.DynamoDB.scan.getCalls().length
        const expected = 2
        assert.equal(actual, expected)
      })
    })
    describe('#retrieve()', () => {
      it('should pass the correct params to dynamoClient.get', async () => {
        const { datastoreProvider, dynamoClient } = setupMocks()
        const instance = datastoreProvider({})
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.retrieve(modelInstance.meta.getModel(), 'my-id')
        const actual = dynamoClient.get.getCall(0).args[0]
        const expected = { key: { id: 'my-id' } }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#delete()', () => {
      it('should pass the correct params to dynamoClient.delete', async () => {
        const { datastoreProvider, dynamoClient } = setupMocks()
        const instance = datastoreProvider({})
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.delete(modelInstance)
        const actual = dynamoClient.delete.getCall(0).args[0]
        const expected = { key: { id: 'my-id' } }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#save()', () => {
      it('should pass results of modelInstance.functions.toObj() to dynamoClient.update', async () => {
        const { datastoreProvider, dynamoClient } = setupMocks()
        const instance = datastoreProvider({})
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.save(modelInstance)
        const actual = dynamoClient.update.getCall(0).args[0]
        const expected = {
          key: { id: 'my-id' },
          item: { id: 'my-id', name: 'my-name' },
        }
        assert.deepEqual(actual, expected)
      })
      it('should pass the correct primary key when changed by the model to dynamoClient.update', async () => {
        const { datastoreProvider, dynamoClient } = setupMocks()
        const instance = datastoreProvider({})
        const modelInstance = createTestModel2({
          notId: 'my-id',
          name: 'my-name',
        })
        await instance.save(modelInstance)
        const actual = dynamoClient.update.getCall(0).args[0]
        const expected = {
          key: { notId: 'my-id' },
          item: { notId: 'my-id', name: 'my-name' },
        }
        assert.deepEqual(actual, expected)
      })
    })
  })
})
