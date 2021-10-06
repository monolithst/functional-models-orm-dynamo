const AWS = require('aws-sdk')
const get = require('lodash/get')
const merge = require('lodash/merge')
// This is a BS error
// eslint-disable-next-line no-unused-vars
const { getTableNameForModel: defaultTableModelName } = require('./utils')
const dynamoClient = require('./dynamoClient')
const queryBuilder = require('./queryBuilder')
const { SCAN_RETURN_THRESHOLD } = require('./constants')

const _readDynamoValue = obj => {
  if (obj.NULL && obj.NULL === true) {
    return null
  }
  if (obj.L) {
    return obj.L.map(x => Object.values(x)[0])
  }
  return Object.values(obj)[0]
}

const dynamoDatastoreProvider = ({
  dynamoOptions,
  getTableNameForModel = defaultTableModelName,
}) => {
  const _doSearchUntilThresholdOrNoLastEvaluatedKey = (
    dynamo,
    tableName,
    ormQuery,
    oldInstancesFound = []
  ) => {
    const query = queryBuilder(tableName, ormQuery)
    return dynamo
      .scan(query)
      .promise()
      .then(data => {
        const instances = data.Items.map(item => {
          return Object.entries(item).reduce((acc, [key, obj]) => {
            const value = _readDynamoValue(obj)
            return merge(acc, { [key]: value })
          }, {})
        }).concat(oldInstancesFound)
        const usingTake = ormQuery.take > 0
        const take = ormQuery.take > 0 ? ormQuery.take : SCAN_RETURN_THRESHOLD
        const lastEvaluatedKey = get(data, 'LastEvaluatedKey', null)
        /*
          We want to keep scanning until we've met our threshold OR
         there is no more keys to evaluate OR
         we have a "take" and we've hit our max.
        */
        const stopForThreshold = instances.length > take
        const stopForNoMore = !lastEvaluatedKey
        if (stopForThreshold || stopForNoMore) {
          return {
            instances: instances.slice(0, take),
            page: usingTake ? null : lastEvaluatedKey,
          }
        }
        const newQuery = merge(ormQuery, {
          page: lastEvaluatedKey,
        })
        return _doSearchUntilThresholdOrNoLastEvaluatedKey(
          dynamo,
          tableName,
          newQuery,
          instances
        )
      })
  }

  const search = (model, ormQuery) => {
    return Promise.resolve().then(async () => {
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
      const key = instance.meta.getModel().getPrimaryKeyName()
      await client.update({ key: { [key]: data[key] }, item: data })
      return data
    })
  }

  const deleteObj = instance => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.meta.getModel())
      const client = dynamoClient({ tableName, dynamoOptions })
      const id = await instance.functions.getPrimaryKey()
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
