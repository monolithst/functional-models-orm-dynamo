import { get, merge } from 'lodash'
import {
  ModelType,
  DataDescription,
  ModelInstance,
  PrimaryKeyType,
  DatastoreAdapter,
  OrmSearch,
} from 'functional-models'
import { filterResults } from 'functional-models-orm-memory'
import {
  fromDynamo,
  getTableNameForModel as defaultTableModelName,
  splitArrayIntoArraysOfMaxSize,
  buildScanQuery,
} from './lib'
import { SCAN_RETURN_THRESHOLD } from './constants'

const MAX_BATCH_SIZE = 25
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

type DatastoreAdapterInputs = Readonly<{
  aws3: Aws3Client
  getTableNameForModel?: <T extends DataDescription>(m: ModelType<T>) => string
}>

type Aws3Client = Readonly<{
  dynamoDbClient: any
  DynamoDBDocumentClient: any
  PutCommand: any
  GetCommand: any
  DeleteCommand: any
  ScanCommand: any
  BatchWriteCommand: any
}>

const create = ({
  aws3,
  getTableNameForModel = defaultTableModelName,
}: DatastoreAdapterInputs): WithRequired<DatastoreAdapter, 'bulkInsert'> => {
  if (!getTableNameForModel) {
    throw new Error(`Must include ${getTableNameForModel}`)
  }
  const _doSearchUntilThresholdOrNoLastEvaluatedKey = async <
    T extends DataDescription,
  >(
    dynamo: any,
    tableName: string,
    ormQuery: OrmSearch,
    oldInstancesFound: T[] = []
  ) => {
    const query = buildScanQuery(tableName, ormQuery.page)
    const command = new aws3.ScanCommand(query)
    const data = await dynamo.send(command)
    const unfiltered: T[] = data.Items.map(fromDynamo)

    const filtered = filterResults<T>(ormQuery, unfiltered).concat(
      oldInstancesFound
    )

    const usingTake = ormQuery.take && ormQuery.take > 0
    const take = usingTake ? ormQuery.take : SCAN_RETURN_THRESHOLD
    const lastEvaluatedKey = get(data, 'LastEvaluatedKey', null)
    /*
      We want to keep scanning until we've met our threshold OR
      there is no more keys to evaluate OR
      we have a "take" and we've hit our max.
    */
    // @ts-ignore
    const stopForThreshold = filtered.length > take
    const stopForNoMore = !lastEvaluatedKey
    if (stopForThreshold || stopForNoMore) {
      return {
        instances: filtered.slice(0, take),
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
      filtered
    )
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

  const search = <T extends DataDescription>(
    model: ModelType<T>,
    ormQuery: OrmSearch
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

  const retrieve = <T extends DataDescription>(
    model: ModelType<T>,
    id: PrimaryKeyType
  ) => {
    return Promise.resolve().then(() => {
      const tableName = getTableNameForModel(model)
      const docClient = _getDocClient()
      const primaryKeyName = model.getModelDefinition().primaryKeyName
      const command = new aws3.GetCommand({
        TableName: tableName,
        Key: { [primaryKeyName]: `${id}` },
      })
      return docClient.send(command).then((x: any) => x.Item as T)
    })
  }

  const save = async <T extends DataDescription>(
    instance: ModelInstance<T>
  ) => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.getModel())
      const docClient = _getDocClient()
      const primaryKeyName = instance
        .getModel()
        .getModelDefinition().primaryKeyName
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

  const deleteObj = <T extends DataDescription>(
    model: ModelType<T>,
    primaryKey: PrimaryKeyType
  ) => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(model)
      const docClient = _getDocClient()
      const primaryKeyName = model.getModelDefinition().primaryKeyName
      const keyObj = { [primaryKeyName]: `${primaryKey}` }
      const command = new aws3.DeleteCommand({
        TableName: tableName,
        Key: keyObj,
      })
      return docClient.send(command).then(() => undefined)
    })
  }

  const bulkInsert = <T extends DataDescription>(
    model: ModelType<T>,
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

export { create }
