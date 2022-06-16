import { assert } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { Model, ModelInstance } from 'functional-models/interfaces'
import { ormQueryBuilder } from 'functional-models-orm/ormQuery'
import { createAwsMocks, createDynamoClient } from '../commonMocks'

const createTestModel1 = ({ id, name }:{id: string, name: string}) => {
  return {
    get: {
      name: () => name,
      id: () => id,
    },
    toObj: () => Promise.resolve({ id, name }),
    getPrimaryKey: () => id,
    getPrimaryKeyName: () => 'id',
    getModel: () => {
      return {
        getName: () => 'TestModel1',
        getPrimaryKeyName: () => 'id',
      } as Model<any>
    }
  } as unknown as ModelInstance<any>
}

const createTestModel2 = ({ notId, name }: any) => ({
  get: {
    notId: () => notId,
    name: () => name,
  },
  toObj: () => Promise.resolve({ notId, name }),
  getPrimaryKey: () => notId,
  getModel: () => ({
    getName: () => 'TestModel1',
    getPrimaryKeyName: () => 'notId',
  }),
}) as unknown as ModelInstance<any>

const setupMocks = () => {
  const AWS = createAwsMocks()
  const dynamoClient = createDynamoClient()
  const datastoreProvider = proxyquire('../../src/datastoreProvider', {
    './dynamoClient': {
      default: dynamoClient,
    }
  })

  return {
    datastoreProvider: datastoreProvider.default,
    dynamoClient,
    AWS,
  }
}

const _createDynamoStringResult = (key: string, value: string) => {
  return {
    [key]: { S: value },
  }
}

const _createDynamoStingArrayResult = (key: string, values: any[]) => {
  return {
    [key]: { L: values.map(x => ({ S: x })) },
  }
}

const _createDynamoNullResult = (key: string) => {
  return {
    [key]: { NULL: true },
  }
}

describe('/src/datastoreProvider.js', function() {
  this.timeout(20000)
  describe('#()', () => {
    it('should not throw an exception with basic arguments', () => {
      const { datastoreProvider, AWS } = setupMocks()
      assert.doesNotThrow(() => {
        const instance = datastoreProvider({AWS})
      })
    })
    it('should have a "search" function', () => {
      const { datastoreProvider, AWS } = setupMocks()
      const instance = datastoreProvider({AWS})
      assert.isFunction(instance.search)
    })
    it('should have a "retrieve" function', () => {
      const { datastoreProvider, AWS } = setupMocks()
      const instance = datastoreProvider({AWS})
      assert.isFunction(instance.retrieve)
    })
    it('should have a "save" function', () => {
      const { datastoreProvider, AWS } = setupMocks()
      const instance = datastoreProvider({AWS})
      assert.isFunction(instance.save)
    })
    it('should have a "delete" function', () => {
      const { datastoreProvider, AWS } = setupMocks()
      const instance = datastoreProvider({ AWS })
      assert.isFunction(instance.delete)
    })
    describe('#search()', () => {
      it('should call dynamo.scan once when LastEvaluatedKey is empty', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({AWS})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
        // @ts-ignore
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [],
              LastEvaluatedKey: null,
            })),
        })
        await instance.search(createTestModel1(obj).getModel(), query)
        // @ts-ignore
        sinon.assert.calledOnce(AWS.DynamoDB.scan)
      })
      it('should be able to process a string value result', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({AWS})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
        // @ts-ignore
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
          createTestModel1(obj).getModel(),
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
        const instance = datastoreProvider({AWS})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', null).compile()
        // @ts-ignore
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
          createTestModel1(obj).getModel(),
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
        const instance = datastoreProvider({AWS})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('names', 'my-name').compile()
        // @ts-ignore
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
          createTestModel1(obj).getModel(),
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
        const instance = datastoreProvider({AWS})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', null).take(1).compile()
        // @ts-ignore
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
          createTestModel1(obj).getModel(),
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
        const instance = datastoreProvider({AWS})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
        // @ts-ignore
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [],
              LastEvaluatedKey: 'try-again',
            })),
        })
        // @ts-ignore
        AWS.DynamoDB.scan.onSecondCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [{ something: 'returned' }],
              LastEvaluatedKey: null,
            })),
        })
        await instance.search(createTestModel1(obj).getModel(), query)
        // @ts-ignore
        sinon.assert.calledTwice(AWS.DynamoDB.scan)
      })
      it('should call dynamo.scan twice when LastEvaluatedKey has a value the second time but take:2 and 3 items are returned', async () => {
        const { datastoreProvider, AWS } = setupMocks()
        const instance = datastoreProvider({AWS})
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder()
          .property('name', 'my-name')
          .take(2)
          .compile()
        // @ts-ignore
        AWS.DynamoDB.scan.onFirstCall().returns({
          promise: () =>
            Promise.resolve().then(() => ({
              Items: [],
              LastEvaluatedKey: 'try-again',
            })),
        })
        // @ts-ignore
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
        await instance.search(createTestModel1(obj).getModel(), query)
        // @ts-ignore
        const actual = AWS.DynamoDB.scan.getCalls().length
        const expected = 2
        assert.equal(actual, expected)
      })
    })
    describe('#retrieve()', () => {
      it('should pass the correct params to dynamoClient.get', async () => {
        const { datastoreProvider, dynamoClient, AWS } = setupMocks()
        const instance = datastoreProvider({AWS})
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.retrieve(modelInstance.getModel(), 'my-id')
        const actual = dynamoClient.get.getCall(0).args[0]
        const expected = { key: { id: 'my-id' } }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#delete()', () => {
      it('should pass the correct params to dynamoClient.delete', async () => {
        const { datastoreProvider, dynamoClient, AWS } = setupMocks()
        const instance = datastoreProvider({AWS})
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.delete(modelInstance)
        const actual = dynamoClient.delete.getCall(0).args[0]
        const expected = { key: { id: 'my-id' } }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#save()', () => {
      it('should pass results of modelInstance.functions.toObj() to dynamoClient.update', async () => {
        const { datastoreProvider, dynamoClient, AWS } = setupMocks()
        const instance = datastoreProvider({AWS})
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
        const { datastoreProvider, dynamoClient, AWS } = setupMocks()
        const instance = datastoreProvider({ AWS })
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
