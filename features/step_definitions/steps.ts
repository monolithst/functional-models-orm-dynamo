import { randomUUID } from 'crypto'
import { assert } from 'chai'
import { Before, After, Given, When, Then } from '@cucumber/cucumber'
import {
  ObjectProperty,
  TextProperty,
  ModelType,
  PrimaryKeyUuidProperty,
  createOrm,
  queryBuilder,
} from 'functional-models'
import * as dynamoDatastoreAdapter from '../../src/datastoreAdapter'
import * as dynamo from '@aws-sdk/client-dynamodb'
import * as libDynamo from '@aws-sdk/lib-dynamodb'

const createDynamoDatastoreProvider = async () => {
  const dynamoDbClient = new dynamo.DynamoDBClient({
    region: 'http://127.0.0.1:42514',
    credentials: {
      accessKeyId: 'x',
      secretAccessKey: 'x',
    },
    endpoint: {
      hostname: 'localhost',
      port: 42514,
      path: '',
      protocol: 'http:',
    },
  })
  /*
  const tableNames = ['model-1', 'model-2', 'model-3'].map(
    name => `functional-models-orm-dynamo-${name}`
  )
  const commands = tableNames.map(name => {
    return new dynamo.CreateTableCommand({
      TableName: name,
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          KeyType: 'HASH',
          AttributeName: 'id',
        },
      ],
    })
  })
  await Promise.all(
    commands.map(x =>
      dynamoDbClient.send(x).catch(e => {
        console.log(e)
      })
    )
  )

   */

  return dynamoDatastoreAdapter.create({
    aws3: {
      ...dynamo,
      ...libDynamo,
      dynamoDbClient,
    },
  })
}

const DATASTORES = {
  DynamoDatastore: createDynamoDatastoreProvider,
}

const MODELS = {
  Model1: [
    {
      pluralName: 'Model1',
      namespace: 'functional-models-orm-dynamo',
      properties: {
        id: TextProperty(),
        name: TextProperty(),
      },
    },
  ],
  Model2: [
    {
      pluralName: 'Model2',
      namespace: 'functional-models-orm-dynamo',
      properties: {
        id: TextProperty(),
        name: TextProperty({ required: false }),
        key: TextProperty({ required: false }),
      },
    },
  ],
  Model3: [
    {
      pluralName: 'Model3',
      namespace: 'functional-models-orm-dynamo',
      properties: {
        id: TextProperty(),
        name: TextProperty({ required: true }),
        obj: ObjectProperty({ required: true }),
      },
    },
  ],
}

const MODEL_DATA = {
  ModelData1: () => ({
    id: 'test-id',
    name: 'test-name',
  }),
  ModelData2: () => ({
    id: 'test-id',
    name: 'test-name',
    key: undefined,
  }),
  StoredModelData2: () => ({
    id: 'test-id',
    name: 'test-name',
    key: null,
  }),
  ModelData3: () => ({
    id: 'test-id',
    name: 'test-name',
    obj: {
      nested: 'value',
      nested2: undefined,
    },
  }),
  StoredModelData3: () => ({
    id: 'test-id',
    name: 'test-name',
    obj: {
      nested: 'value',
    },
  }),
  BulkModelData1: () => ({
    id: randomUUID(),
    name: 'test-me',
  }),
  SearchResult1: () => ({
    instances: [
      {
        id: 'test-id',
        name: 'test-name',
      },
    ],
    page: null,
  }),
  EmptyModel: () => ({}),
  undefined: () => undefined,
}

const QUERIES = {
  SearchQuery1: queryBuilder().property('name', 'test-name').take(1).compile(),
  BulkSearchQuery1: queryBuilder()
    //.property('name', 'test-me')
    .compile(),
}

const _emptyDatastoreProvider = async (model, datastoreAdapter) => {
  await datastoreAdapter
    .search(model, queryBuilder().compile())
    .then(async obj =>
      Promise.all(
        obj.instances.map(x => {
          return model.create(x).delete()
        })
      )
    )
}

Given('orm using the {word}', async function (store) {
  store = await DATASTORES[store](this)
  if (!store) {
    throw new Error(`${store} did not result in a datastore.`)
  }

  this.Model = createOrm({ datastoreAdapter: store }).Model
  this.datastoreAdapter = store
})

Given('the datastore is emptied of models', function () {
  return _emptyDatastoreProvider(this.model, this.datastoreAdapter)
})

Given('the orm is used to create {word}', function (modelType) {
  const model = MODELS[modelType]
  if (!model) {
    throw new Error(`${modelType} did not result in a model.`)
  }
  this.model = this.Model(...model)
})

When('instances of the model are created with {word}', function (dataKey) {
  if (!MODEL_DATA[dataKey]()) {
    throw new Error(`${dataKey} did not result in data.`)
  }
  this.instances = MODEL_DATA[dataKey]().map(this.model.create)
})

When(
  'an instance of the model is created with {word}',
  async function (dataKey) {
    const data = MODEL_DATA[dataKey]()
    if (!data) {
      throw new Error(`${dataKey} did not result in a data object.`)
    }
    this.modelInstance = this.model.create(data)
  }
)

When('save is called on the instances', function () {
  return Promise.all(this.instances.map(x => x.save()))
})

When('save is called on the model', function () {
  return this.modelInstance
    .save()
    .catch(e => {
      console.log(e)
      throw e
    })
    .then(x => (this.saveResult = x))
})

When('delete is called on the model', function () {
  return this.modelInstance.delete().then(x => (this.deleteResult = x))
})

When("the datastore's retrieve is called with values", function (table) {
  const rows = table.rowsHash()
  const id = rows.id
  return this.datastoreAdapter.retrieve(this.model, id).then(obj => {
    this.result = obj
  })
})

When("the datastore's delete is called with modelInstance", async function () {
  return this.datastoreAdapter
    .delete(
      this.modelInstance.getModel(),
      await this.modelInstance.getPrimaryKey()
    )
    .then(obj => {
      this.result = obj
    })
})

When("the datastore's search is called with {word}", function (key) {
  const query = QUERIES[key]
  return this.datastoreAdapter.search(this.model, query).then(async obj => {
    this.result = obj
  })
})

When('search is called on the Model using the query', function () {
  this.model.search(this.query).then(x => (this.searchResults = x))
})

Then('the result matches {word}', function (dataKey) {
  const data = MODEL_DATA[dataKey]()
  try {
    assert.deepEqual(this.result, data)
  } catch (e) {
    throw e
  }
})

Then('{int} search results are found', function (count) {
  assert.equal(this.result.instances.length, count)
})

When(
  '{int} instances of the model are created with {word}',
  function (count, key) {
    this.instances = [...new Array(count)]
      .map(MODEL_DATA[key])
      .map(this.model.create)
  }
)

When(/^bulkInsert is called on the model$/, function () {
  this.model.bulkInsert(this.instances)
})
When(/^we want (\d+) seconds$/, async function (seconds) {
  await new Promise(r => {
    setTimeout(r, seconds * 1000)
  })
})

const _pollSearchCount = async (
  startTime,
  maxMilliseconds,
  model,
  query,
  count
) => {
  const now = new Date()
  const diff = now.getTime() - startTime.getTime()
  if (diff > maxMilliseconds) {
    throw new Error(`Max seconds reached: ${maxMilliseconds / 1000}`)
  }
  const result = await model.search(query)
  if (result.instances.length === count) {
    return
  }
  return _pollSearchCount(startTime, maxMilliseconds, model, query, count)
}

When(
  'we poll for {int} seconds for {int} results with {word}',
  { timeout: 10 * 60 * 1000 },
  async function (seconds, count, queryKey) {
    const query = QUERIES[queryKey]
    const maxSeconds = count + 3
    await _pollSearchCount(
      new Date(),
      maxSeconds * 1000,
      this.model,
      query,
      count
    )
  }
)
