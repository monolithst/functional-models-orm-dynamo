import { assert } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { Model, FunctionalModel } from 'functional-models/interfaces'
import { OrmModel, OrmModelInstance } from 'functional-models-orm/interfaces'
import { ormQueryBuilder } from 'functional-models-orm/ormQuery'
import { createAws3MockClient } from '../commonMocks'
import createDatastoreProvider from '../../src/datastoreProvider'

const createTestModel1 = ({ id, name }: { id: string; name: string }) => {
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
      } as OrmModel<any>
    },
  } as unknown as OrmModelInstance<FunctionalModel, OrmModel<FunctionalModel>>
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
      getPrimaryKeyName: () => 'notId',
    }),
  }) as unknown as OrmModelInstance<FunctionalModel, OrmModel<FunctionalModel>>

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

describe('/src/datastoreProvider.ts', function () {
  this.timeout(20000)
  describe('#()', () => {
    it('should not throw an exception with basic arguments', () => {
      const aws3 = createAws3MockClient()
      const dynamoOptions = { region: 'fake-region' }
      assert.doesNotThrow(() => {
        const datastoreProvider = createDatastoreProvider({
          aws3,
          dynamoOptions,
        })
      })
    })
    it('should have a "search" function', () => {
      const aws3 = createAws3MockClient()
      const dynamoOptions = { region: 'fake-region' }
      const instance = createDatastoreProvider({ aws3, dynamoOptions })
      assert.isFunction(instance.search)
    })
    it('should have a "retrieve" function', () => {
      const aws3 = createAws3MockClient()
      const dynamoOptions = { region: 'fake-region' }
      const instance = createDatastoreProvider({ aws3, dynamoOptions })
      assert.isFunction(instance.retrieve)
    })
    it('should have a "save" function', () => {
      const aws3 = createAws3MockClient()
      const dynamoOptions = { region: 'fake-region' }
      const instance = createDatastoreProvider({ aws3, dynamoOptions })
      assert.isFunction(instance.save)
    })
    it('should have a "delete" function', () => {
      const aws3 = createAws3MockClient()
      const dynamoOptions = { region: 'fake-region' }
      const instance = createDatastoreProvider({ aws3, dynamoOptions })
      assert.isFunction(instance.delete)
    })
    describe('#search()', () => {
      it('should pass createUniqueId into queryBuilder', async () => {
        const aws3 = createAws3MockClient()
        const dynamoOptions = { region: 'fake-region' }
        const myFunc = () => 'fake-id'
        const instance = createDatastoreProvider({
          aws3,
          dynamoOptions,
          createUniqueId: myFunc,
        })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
        // @ts-ignore
        aws3.DynamoDBDocumentClient.sendSinon.onFirstCall().resolves({
          Items: [],
          LastEvaluatedKey: null,
        })
        await instance.search(createTestModel1(obj).getModel(), query)
        const actual = aws3.ScanCommand.sinon.getCall(0).args[0]
        const expected = {
          TableName: 'testmodel1',
          FilterExpression: '#myfakeid = :myfakeid',
          ExpressionAttributeNames: { '#myfakeid': 'name' },
          ExpressionAttributeValues: { ':myfakeid': 'my-name' },
        }
        assert.deepInclude(actual, expected)
      })
      it('should call dynamo.scan once when LastEvaluatedKey is empty', async () => {
        const aws3 = createAws3MockClient()
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
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
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
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
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', null).compile()
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
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('names', 'my-name').compile()
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
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', null).take(1).compile()
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
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder().property('name', 'my-name').compile()
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
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const obj = { id: 'my-id', name: 'my-name' }
        const query = ormQueryBuilder()
          .property('name', 'my-name')
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
            { something: 'returned' },
            { something2: 'returned2' },
            { something3: 'returned3' },
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
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({
          aws3,
          dynamoOptions,
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
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({
          aws3,
          dynamoOptions,
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
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.retrieve(modelInstance.getModel(), 'my-id')
        const actual = aws3.GetCommand.sinon.getCall(0).args[0]
        const expected = { Key: { id: 'my-id' }, TableName: 'testmodel1' }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#delete()', () => {
      it('should pass the correct params to DeleteCommand', async () => {
        const aws3 = createAws3MockClient()
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.delete(modelInstance)
        const actual = aws3.DeleteCommand.sinon.getCall(0).args[0]
        const expected = { Key: { id: 'my-id' }, TableName: 'testmodel1' }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#save()', () => {
      it('should pass results of modelInstance.functions.toObj() to PutCommand', async () => {
        const aws3 = createAws3MockClient()
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const modelInstance = createTestModel1({ id: 'my-id', name: 'my-name' })
        await instance.save(modelInstance)
        const actual = aws3.PutCommand.sinon.getCall(0).args[0]
        const expected = {
          Key: { id: 'my-id' },
          Item: { id: 'my-id', name: 'my-name' },
          TableName: 'testmodel1',
        }
        assert.deepEqual(actual, expected)
      })
      it('should pass the correct primary key when changed by the model to PutCommand', async () => {
        const aws3 = createAws3MockClient()
        const dynamoOptions = { region: 'fake-region' }
        const instance = createDatastoreProvider({ aws3, dynamoOptions })
        const modelInstance = createTestModel2({
          notId: 'my-id',
          name: 'my-name',
        })
        await instance.save(modelInstance)
        const actual = aws3.PutCommand.sinon.getCall(0).args[0]
        const expected = {
          Key: { notId: 'my-id' },
          Item: { notId: 'my-id', name: 'my-name' },
          TableName: 'testmodel1',
        }
        assert.deepEqual(actual, expected)
      })
    })
  })
})
