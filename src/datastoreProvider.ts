import { get, merge } from 'lodash'
import {
  Model,
  FunctionalModel,
  ModelInstance,
  PrimaryKeyType,
} from 'functional-models/interfaces'
import { OrmQuery, DatastoreProvider } from 'functional-models-orm/interfaces'
import {
  getTableNameForModel as defaultTableModelName,
  splitArrayIntoArraysOfMaxSize,
} from './lib'
import queryBuilder from './queryBuilder'
import { SCAN_RETURN_THRESHOLD } from './constants'

const MAX_BATCH_SIZE = 25

type DatastoreProviderInputs = {
  readonly aws3: Aws3Client
  readonly getTableNameForModel?: <T extends FunctionalModel>(
    m: Model<T>
  ) => string
  readonly createUniqueId?: ((s: any) => string) | undefined
}

type Aws3Client = {
  readonly dynamoDbClient: any
  readonly DynamoDBDocumentClient: any
  readonly PutCommand: any
  readonly GetCommand: any
  readonly DeleteCommand: any
  readonly ScanCommand: any
  readonly BatchWriteCommand: any
}

const dynamoDatastoreProvider = ({
  aws3,
  getTableNameForModel = defaultTableModelName,
  createUniqueId = undefined,
}: DatastoreProviderInputs): DatastoreProvider => {
  if (!getTableNameForModel) {
    throw new Error(`Must include ${getTableNameForModel}`)
  }
  const _doSearchUntilThresholdOrNoLastEvaluatedKey = (
    dynamo: any,
    tableName: string,
    ormQuery: OrmQuery,
    oldInstancesFound = []
  ) => {
    const query = queryBuilder({ createUniqueId })(tableName, ormQuery)
    const command = new aws3.ScanCommand(query)
    return dynamo.send(command).then((data: any) => {
      const instances = data.Items.map((item: object) => {
        return Object.entries(item).reduce((acc, [key, obj]) => {
          return merge(acc, { [key]: obj })
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

  const _getDocClient = () => {
    const marshallOptions = {
      removeUndefinedValues: true,
    }
    const translateConfig = { marshallOptions }
    return aws3.DynamoDBDocumentClient.from(
      aws3.dynamoDbClient,
      translateConfig
    )
  }

  const search = <T extends FunctionalModel>(
    model: Model<T>,
    ormQuery: OrmQuery
  ) => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(model)
      const docClient = _getDocClient()
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
      const docClient = _getDocClient()
      const primaryKeyName = model.getPrimaryKeyName()
      const command = new aws3.GetCommand({
        TableName: tableName,
        Key: { [primaryKeyName]: `${id}` },
      })
      return docClient.send(command).then((x: any) => x.Item as T)
    })
  }

  const save = async <T extends FunctionalModel, TModel extends Model<T>>(
    instance: ModelInstance<T, TModel>
  ) => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.getModel())
      const docClient = _getDocClient()
      const primaryKeyName = instance.getModel().getPrimaryKeyName()
      const data = await instance.toObj()
      const key = `${(data as any)[primaryKeyName]}`
      const keyObj = { [primaryKeyName]: key }
      const command = new aws3.PutCommand({
        TableName: tableName,
        Key: keyObj,
        Item: { ...data, ...keyObj },
      })
      return docClient.send(command).then(() => data)
    })
  }

  const deleteObj = <T extends FunctionalModel, TModel extends Model<T>>(
    instance: ModelInstance<T, TModel>
  ) => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.getModel())
      const docClient = _getDocClient()
      const primaryKeyName = instance.getModel().getPrimaryKeyName()
      const id = await instance.getPrimaryKey()
      const keyObj = { [primaryKeyName]: `${id}` }
      const command = new aws3.DeleteCommand({
        TableName: tableName,
        Key: keyObj,
      })
      return docClient.send(command).then(() => undefined)
    })
  }

  const bulkInsert = <T extends FunctionalModel>(
    model: Model<T>,
    instances: readonly ModelInstance<T>[]
  ): Promise<void> => {
    return Promise.resolve().then(async () => {
      if (instances.length < 1) {
        return undefined
      }
      const tableName = getTableNameForModel(model)
      const docClient = _getDocClient()
      const requestItems = await instances.reduce(
        async (accP, instance) => {
          const acc = await accP
          const data = await instance.toObj()
          return acc.concat({
            PutRequest: { Item: data },
          })
        },
        Promise.resolve([] as any)
      )
      const batches = splitArrayIntoArraysOfMaxSize(
        requestItems,
        MAX_BATCH_SIZE
      )
      return batches
        .reduce(async (accP, batch) => {
          await accP
          const command = new aws3.BatchWriteCommand({
            RequestItems: {
              [tableName]: batch,
            },
          })
          return docClient.send(command)
        }, Promise.resolve())
        .then(() => undefined)
    })
  }

  return {
    search,
    retrieve,
    save,
    delete: deleteObj,
    bulkInsert,
  }
}

export default dynamoDatastoreProvider
