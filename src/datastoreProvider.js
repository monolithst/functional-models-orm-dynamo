const AWS = require('aws-sdk')
const get = require('lodash/get')
const merge = require('lodash/merge')
// This is a BS error
// eslint-disable-next-line no-unused-vars
const { getTableNameForModel } = require('./utils')
const dynamoClient = require('./dynamoClient')
const queryBuilder = require('./queryBuilder')
const { SCAN_RETURN_THRESHOLD } = require('./constants')

const dynamoDatastoreProvider = ({
  dynamoOptions,
  getTableNameForModel = getTableNameForModel,
}) => {
  const _doSearchUntilThresholdOrNoLastEvaluatedKey = (
    dynamo,
    tableName,
    ormQuery,
    oldModelsFound = []
  ) => {
    const query = queryBuilder(tableName, ormQuery)
    return dynamo
      .scan(query)
      .promise()
      .then(data => {
        const models = data.Items.map(item => {
          return Object.entries(item).reduce((acc, [key, obj]) => {
            const value = Object.values(obj)[0]
            return merge(acc, { [key]: value })
          }, {})
        }).concat(oldModelsFound)
        const lastEvaluatedKey = get(data, 'LastEvaluatedKey', null)
        // We want to keep scanning until we've met our threshold OR there is no more keys to evaluate
        if (models.length < SCAN_RETURN_THRESHOLD && lastEvaluatedKey) {
          const newQuery = merge(ormQuery, {
            page: lastEvaluatedKey,
          })
          return _doSearchUntilThresholdOrNoLastEvaluatedKey(
            dynamo,
            tableName,
            newQuery,
            models
          )
        }
        return {
          models,
          page: lastEvaluatedKey,
        }
      })
  }

  const search = (model, ormQuery) => {
    return Promise.resolve().then(() => {
      const tableName = getTableNameForModel(model)
      const dynamo = new AWS.DynamoDB(dynamoOptions)
      return _doSearchUntilThresholdOrNoLastEvaluatedKey(
        dynamo,
        tableName,
        ormQuery
      )
    })
  }

  const retrieve = (model, id) => {
    return Promise.resolve().then(() => {
      const tableName = getTableNameForModel(model)
      const client = dynamoClient({ tableName, dynamoOptions })
      return client.get({ key: { id } })
    })
  }

  const save = async instance => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.meta.getModel())
      const client = dynamoClient({ tableName, dynamoOptions })
      const data = await instance.functions.toObj()
      await client.update({ key: { id: data.id }, item: data })
      return instance.meta.getModel().create(data)
    })
  }

  const deleteObj = instance => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.meta.getModel())
      const client = dynamoClient({ tableName, dynamoOptions })
      const id = await instance.getId()
      return client.delete({ key: { id } })
    })
  }

  return {
    search,
    retrieve,
    save,
    delete: deleteObj,
  }
}

module.exports = dynamoDatastoreProvider
