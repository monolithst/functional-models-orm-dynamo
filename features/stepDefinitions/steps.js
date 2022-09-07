const assert = require('chai').assert
const { Before, After, Given, When, Then } = require('cucumber')
const { TextProperty, Model, UniqueId } = require('functional-models')
const { ormQuery, orm } = require('functional-models-orm')
const createDatastoreProvider = require('../../dist/datastoreProvider').default

const createDynamoDatastoreProvider = (context) => {
  if (!context.parameters.testTable) {
    throw new Error(`Must include a testing table that exists in the world parameters.`)
  }
  if (!context.parameters.awsRegion) {
    throw new Error(`Must include awsRegion in the world parameters.`)
  }
  this.table = context.parameters.testTable
  return createDatastoreProvider({
    AWS: require('aws-sdk'),
    dynamoOptions: {
      region: context.parameters.awsRegion
    },
    getTableNameForModel: () => {
      return `${this.table}`
    }
  })
}

const DATASTORES = {
  DynamoDatastore: createDynamoDatastoreProvider,
}

const MODELS = {
  Model1: [
    'Model1',
    {
      properties: {
        name: TextProperty(),
      }
    },
  ],
}

const MODEL_DATA = {
  ModelData1: {
    id: 'test-id',
    name: 'test-name',
  },
  SearchResult1: {
    instances: [{
      id: 'test-id',
      name: 'test-name',
    }],
    page: null 
  },
  EmptyModel: {},
  'undefined': undefined,
}

const QUERIES = {
  SearchQuery1: ormQuery.ormQueryBuilder() 
    .property('name', 'test-name')
    .take(1)
    .compile(),
}

const _emptyDatastoreProvider = async (model, datastoreProvider) => {
  await datastoreProvider.search(model, ormQuery.ormQueryBuilder().compile())
    .then(async obj => Promise.all(obj.instances.map(x => {
      return model.create(x).delete()
    })))
}

Given('orm using the {word}', function (store) {
  store = DATASTORES[store](this)
  if (!store) {
    throw new Error(`${store} did not result in a datastore.`)
  }

  this.BaseModel = orm({ datastoreProvider: store }).BaseModel
  this.datastoreProvider = store
})

Given('the datastore is emptied of models', function() {
  return _emptyDatastoreProvider(this.model, this.datastoreProvider)
})

Given('the orm is used to create {word}', function (modelType) {
  const model = MODELS[modelType]
  if (!model) {
    throw new Error(`${modelType} did not result in a model.`)
  }
  this.model = this.BaseModel(...model)
})

Given('the ormQueryBuilder is used to make {word}', function (queryKey) {
  if (!QUERY_BUILDER_FUNCS[queryKey]) {
    throw new Error(`${queryKey} did not result in a query`)
  }

  this.query = QUERY_BUILDER_FUNCS[queryKey]()
})

When('instances of the model are created with {word}', function (dataKey) {
  if (!MODEL_DATA[dataKey]) {
    throw new Error(`${dataKey} did not result in data.`)
  }
  this.instances = MODEL_DATA[dataKey].map(this.model.create)
})

When('an instance of the model is created with {word}', async function (dataKey) {
  const data = MODEL_DATA[dataKey]
  if (!data) {
    throw new Error(`${dataKey} did not result in a data object.`)
  }
  this.modelInstance = this.model.create(data)
})

When('save is called on the instances', function () {
  return Promise.all(this.instances.map(x => x.save()))
})

When('save is called on the model', function () {
  return this.modelInstance.save().then(x => (this.saveResult = x))
})

When('delete is called on the model', function () {
  return this.modelInstance
    .delete()
    .then(x => (this.deleteResult = x))
})

When("the datastore's retrieve is called with values", function (table) {
  const rows = table.rowsHash()
  const id = rows.id
  return this.datastoreProvider.retrieve(this.model, id).then(obj => {
    this.result = obj
  })
})

When("the datastore's delete is called with modelInstance", function () {
  return this.datastoreProvider.delete(this.modelInstance).then(obj => {
    this.result = obj
  })
})

When("the datastore's search is called with {word}", function (key) {
  const query = QUERIES[key]
  return this.datastoreProvider.search(this.model, query).then(async obj => {
    console.log(obj)
    this.result = obj
  })
})

When('search is called on the Model using the query', function () {
  this.model.search(this.query).then(x => (this.searchResults = x))
})

Then('the result matches {word}', function (dataKey) {
  const data = MODEL_DATA[dataKey]
  assert.deepEqual(this.result, data)
})

Then('{int} search results are found', function (count) {
  assert.equal(this.searchResults.instances.length, count)
})
