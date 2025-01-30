import { assert } from 'chai'
import sinon from 'sinon'
import {
  Model,
  queryBuilder,
  DataDescription,
  OrmModel,
  OrmModelInstance,
} from 'functional-models'
import { createAws3MockClient } from '../commonMocks'
import * as datastoreAdapter from '../../src/datastoreAdapter'

const createTestModel1 = ({ id, name }: { id: string; name: string }) => {
  return {
    get: {
      name: () => name,
      id: () => id,
    },
    toObj: () => Promise.resolve({ id, name }),
    getPrimaryKey: () => id,
    getModel: () => {
      return {
        getName: () => 'TestModel1',
        getModelDefinition: () => ({
          primaryKeyName: 'id',
        }),
      } as OrmModel<any>
    },
  } as unknown as OrmModelInstance<DataDescription, OrmModel<DataDescription>>
}

const createTestModel2 = ({ notId, name }: any) =>
  ({
    get: {
      notId: () => notId,
      name: () => name,
    },
    toObj: () => Promise.resolve({ notId, name }),
    getPrimaryKey: () => notId,
    getModel: () => ({
      getName: () => 'TestModel1',
      getModelDefinition: () => ({
        primaryKeyName: 'notId',
      }),
    }),
  }) as unknown as OrmModelInstance<DataDescription, OrmModel<DataDescription>>

const _createDynamoStringResult = (key: string, value: string) => {
  return {
    [key]: value,
  }
}

const _createDynamoStingArrayResult = (key: string, values: any[]) => {
  return {
    [key]: values,
  }
}

const _createDynamoNullResult = (key: string) => {
  return {
    [key]: null,
  }
}

describe('/src/datastoreAdapter.ts', function () {
  this.timeout(20000)
  describe('#()', () => {
    it('should not throw an exception with basic arguments', () => {
      const aws3 = createAws3MockClient()
      assert.doesNotThrow(() => {
        datastoreAdapter.create({
          aws3,
        })
      })
    })
    it('should throw an exception if getTaqbleNameForModel is null', () => {
      const aws3 = createAws3MockClient()
      assert.throws(() => {
        datastoreAdapter.create({
          aws3,
          // @ts-ignore
          getTableNameForModel: null,
        })
      })
    })
    it('should have a "search" function', () => {
      const aws3 = createAws3MockClient()
      const instance = datastoreAdapter.create({ aws3 })
      assert.isFunction(instance.search)
    })
    it('should have a "retrieve" function', () => {
      const aws3 = createAws3MockClient()
      const instance = datastoreAdapter.create({ aws3 })
      assert.isFunction(instance.retrieve)
    })
    it('should have a "save" function', () => {
      const aws3 = createAws3MockClient()
      const instance = datastoreAdapter.create({ aws3 })
      assert.isFunction(instance.save)
    })
    it('should have a "delete" function', () => {
      const aws3 = createAws3MockClient()
      const instance = datastoreAdapter.create({ aws3 })
      assert.isFunction(instance.delete)
    })
    describe('#search()', () => {
      it('should call dynamo.scan once when LastEvaluatedKey is empty', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = queryBuilder().property('name', 'my-name').compile()
        // @ts-ignore
        aws3.DynamoDBDocumentClient.sendSinon.onFirstCall().resolves({
          Items: [],
          LastEvaluatedKey: null,
        })
        await instance.search(createTestModel1(obj).getModel(), query)
        // @ts-ignore
        sinon.assert.calledOnce(aws3.ScanCommand.sinon)
      })
      it('should be able to process a string value result', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = queryBuilder().property('name', 'my-name').compile()
        // @ts-ignore
        aws3.DynamoDBDocumentClient.sendSinon.onFirstCall().resolves({
          Items: [
            {
              ..._createDynamoStringResult('id', 'my-id'),
              ..._createDynamoStringResult('name', 'my-name'),
            },
          ],
          LastEvaluatedKey: null,
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
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = queryBuilder().property('name', null).compile()
        // @ts-ignore
        aws3.DynamoDBDocumentClient.sendSinon.onFirstCall().resolves({
          Items: [
            {
              ..._createDynamoStringResult('id', 'my-id'),
              ..._createDynamoNullResult('name'),
            },
          ],
          LastEvaluatedKey: null,
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
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = queryBuilder().property('id', 'my-id').compile()
        // @ts-ignore
        aws3.DynamoDBDocumentClient.sendSinon.onFirstCall().resolves({
          Items: [
            {
              ..._createDynamoStringResult('id', 'my-id'),
              ..._createDynamoStingArrayResult('names', ['a', 'b']),
            },
          ],
          LastEvaluatedKey: null,
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
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = queryBuilder()
          .property('name', 'name', { startsWith: true })
          .take(1)
          .compile()
        // @ts-ignore
        aws3.DynamoDBDocumentClient.sendSinon.onFirstCall().resolves({
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
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = queryBuilder().property('name', 'my-name').compile()
        // @ts-ignore
        aws3.DynamoDBDocumentClient.sendSinon.onFirstCall().resolves({
          Items: [],
          LastEvaluatedKey: 'try-again',
        })
        // @ts-ignore
        aws3.ScanCommand.sinon.onSecondCall().resolves({
          Items: [{ something: 'returned' }],
          LastEvaluatedKey: null,
        })
        await instance.search(createTestModel1(obj).getModel(), query)
        // @ts-ignore
        sinon.assert.calledTwice(aws3.ScanCommand.sinon)
      })
      it('should call dynamo.scan twice when LastEvaluatedKey has a value the second time but take:2 and 3 items are returned', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const obj = { id: 'name', name: 'returned' }
        const query = queryBuilder()
          .property('name', 'returned', { startsWith: true })
          .take(2)
          .compile()
        // @ts-ignore
        aws3.DynamoDBDocumentClient.sendSinon.onFirstCall().resolves({
          Items: [],
          LastEvaluatedKey: 'try-again',
        })
        // @ts-ignore
        aws3.DynamoDBDocumentClient.sendSinon.onSecondCall().resolves({
          Items: [
            { name: 'returned' },
            { name: 'returned2' },
            { name: 'returned3' },
          ],
          LastEvaluatedKey: 'another-value',
        })
        await instance.search(createTestModel1(obj).getModel(), query)
        // @ts-ignore
        const actual = aws3.DynamoDBDocumentClient.sendSinon.getCalls().length
        const expected = 2
        assert.equal(actual, expected)
      })
    })
    describe('#retrieve()', () => {
      it('should create a document client with marshallOptions.removeUndefinedValues=true', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({
          aws3,
          getTableNameForModel: () => 'FakeTable',
        })
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.retrieve(modelInstance.getModel(), 'my-id')
        const actual = aws3.DynamoDBDocumentClient.from.getCall(0).args[1]
        const expected = {
          marshallOptions: {
            removeUndefinedValues: true,
          },
        }
        assert.deepInclude(actual, expected)
      })
      it('should pass the correct table name into GetCommand', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({
          aws3,
          getTableNameForModel: () => 'FakeTable',
        })
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.retrieve(modelInstance.getModel(), 'my-id')
        const actual = aws3.GetCommand.sinon.getCall(0).args[0]
        const expected = { Key: { id: 'my-id' }, TableName: 'FakeTable' }
        assert.deepEqual(actual, expected)
      })
      it('should pass the correct params to GetCommand', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.retrieve(modelInstance.getModel(), 'my-id')
        const actual = aws3.GetCommand.sinon.getCall(0).args[0]
        const expected = { Key: { id: 'my-id' }, TableName: 'test-model-1' }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#delete()', () => {
      it('should pass the correct params to DeleteCommand', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.delete(modelInstance.getModel(), 'my-id')
        const actual = aws3.DeleteCommand.sinon.getCall(0).args[0]
        const expected = { Key: { id: 'my-id' }, TableName: 'test-model-1' }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#save()', () => {
      it('should pass results of modelInstance.functions.toObj() to PutCommand', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.save(modelInstance)
        const actual = aws3.PutCommand.sinon.getCall(0).args[0]
        const expected = {
          Key: { id: 'my-id' },
          Item: { id: 'my-id', name: 'my-name' },
          TableName: 'test-model-1',
        }
        assert.deepEqual(actual, expected)
      })
      it('should pass the correct primary key when changed by the model to PutCommand', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const modelInstance = createTestModel2({
          notId: 'my-id',
          name: 'my-name',
        })
        await instance.save(modelInstance)
        const actual = aws3.PutCommand.sinon.getCall(0).args[0]
        const expected = {
          Key: { notId: 'my-id' },
          Item: { notId: 'my-id', name: 'my-name' },
          TableName: 'test-model-1',
        }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#bulkInsert()', () => {
      it('should format the objects correctly when passed to BatchWriteCommand', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const models = [
          createTestModel1({ id: '1', name: 'my-name' }),
          createTestModel1({ id: '2', name: 'my-name' }),
          createTestModel1({ id: '3', name: 'my-name' }),
          createTestModel1({ id: '4', name: 'my-name' }),
          createTestModel1({ id: '5', name: 'my-name' }),
        ]
        await instance.bulkInsert(
          // @ts-ignore
          {
            getName: () => 'TestName',
          },
          models
        )
        const actual = aws3.BatchWriteCommand.sinon.getCall(0).args[0]
        const expected = {
          RequestItems: {
            'test-name': [
              { PutRequest: { Item: { id: '1', name: 'my-name' } } },
              { PutRequest: { Item: { id: '2', name: 'my-name' } } },
              { PutRequest: { Item: { id: '3', name: 'my-name' } } },
              { PutRequest: { Item: { id: '4', name: 'my-name' } } },
              { PutRequest: { Item: { id: '5', name: 'my-name' } } },
            ],
          },
        }
        assert.deepEqual(actual, expected)
      })
      it('should not call BulkWriteCommand if there are no models', async () => {
        const aws3 = createAws3MockClient()
        const instance = datastoreAdapter.create({ aws3 })
        const models: any[] = []
        await instance.bulkInsert(
          // @ts-ignore
          {
            getName: () => 'TestName',
          },
          models
        )
        const actual = aws3.BatchWriteCommand.sinon.called
        assert.isFalse(actual)
      })
    })
  })
})
