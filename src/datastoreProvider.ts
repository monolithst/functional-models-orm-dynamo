import { get, merge } from 'lodash'
import { Model, FunctionalModel, ModelInstance, PrimaryKeyType } from 'functional-models/interfaces'
import { OrmQuery, DatastoreProvider } from 'functional-models-orm/interfaces'
// This is a BS error
// eslint-disable-next-line no-unused-vars
import { getTableNameForModel as defaultTableModelName } from './utils'
import dynamoClient from './dynamoClient'
import queryBuilder from './queryBuilder'
import { SCAN_RETURN_THRESHOLD } from './constants'

type DatastoreProviderInputs = {
  AWS: any,
  dynamoOptions: object,
  getTableNameForModel: (m: Model<any>) => string,
  createUniqueId: ((s: any) => string)|undefined,
}

const dynamoDatastoreProvider = ({
  AWS,
  dynamoOptions,
  getTableNameForModel = defaultTableModelName,
  createUniqueId = undefined,
}: DatastoreProviderInputs) : DatastoreProvider => {
  const _doSearchUntilThresholdOrNoLastEvaluatedKey = (
    dynamo: any,
    tableName: string,
    ormQuery: OrmQuery,
    oldInstancesFound = []
  ) => {
    const query = queryBuilder({ createUniqueId })(tableName, ormQuery)
    return dynamo
      .scan(query)
      .promise()
      .then((data: any) => {
        const instances = data.Items.map((item: object) => {
          return Object.entries(item).reduce((acc, [key, obj]) => {
            return merge(acc, { [key]: obj})
          }, {})
        }).concat(oldInstancesFound)

        const usingTake = ormQuery.take && ormQuery.take > 0
        const take = usingTake ? ormQuery.take : SCAN_RETURN_THRESHOLD
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

  const search = <T extends FunctionalModel>(
    model: Model<T>,
    ormQuery: OrmQuery
  ) => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(model)
      const dynamo = new AWS.DynamoDB(dynamoOptions)
      const docClient = new AWS.DynamoDB.DocumentClient({ service: dynamo })
      return _doSearchUntilThresholdOrNoLastEvaluatedKey(
        docClient,
        tableName,
        ormQuery
      )
    })
  }

  const retrieve = <T extends FunctionalModel>(
    model: Model<T>,
    id: PrimaryKeyType
  ) => {
    return Promise.resolve().then(() => {
      const tableName = getTableNameForModel(model)
      const client = dynamoClient({ tableName, dynamoOptions, AWS })
      const primaryKeyName = model.getPrimaryKeyName()
      return client.get<T>({ key: { [primaryKeyName]: `${id}` }})
    })
  }

  const save = async <T extends FunctionalModel, TModel extends Model<T>>(
    instance: ModelInstance<T, TModel>
  ) => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.getModel())
      const client = dynamoClient({ tableName, AWS, dynamoOptions })
      const data = await instance.toObj()
      const key = instance.getModel().getPrimaryKeyName()
      await client.update({ key: { [key]: `${(data as any)[key]}` }, item: data })
      return data
    })
  }

  const deleteObj = <T extends FunctionalModel, TModel extends Model<T>>(
    instance: ModelInstance<T, TModel>
  ) => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.getModel())
      const client = dynamoClient({ tableName, AWS, dynamoOptions })
      const id = await instance.getPrimaryKey()
      const primaryKeyName = instance.getModel().getPrimaryKeyName()
      await client.delete({ key: { [primaryKeyName]: `${id}` } })
    })
  }

  return {
    search,
    retrieve,
    save,
    delete: deleteObj,
  }
}

export default dynamoDatastoreProvider
