import { randomUUID } from 'crypto'
import { merge, get, identity } from 'lodash'
import {
  OrmQuery,
  OrmQueryStatement,
  PropertyStatement,
} from 'functional-models-orm/interfaces'
import { ORMType } from 'functional-models-orm/constants'

type DynamoOrmStatement = OrmQueryStatement & { myUniqueId: string }
type DynamoPropertyStatement = PropertyStatement & { myUniqueId: string }

const COMPARISONS = {
  EQ: 'EQ',
}

const DATA_TYPES = {
  STRING: 'S',
  NUMBER: 'N',
  BOOLEAN: 'BOOL',
  NULL: 'NULL',
  ARRAY: 'L',
  OBJECT: 'M',
}

const ORM_TYPE_TO_DYNAMO_TYPE: { [key in ORMType]: string } = {
  string: DATA_TYPES.STRING,
  number: DATA_TYPES.NUMBER,
  date: DATA_TYPES.STRING,
  object: DATA_TYPES.OBJECT,
  boolean: DATA_TYPES.BOOLEAN,
}

const _idGenerator = (existingFunc: any): ((s: any) => string) => {
  if (!existingFunc) {
    return (_: string) => randomUUID().replace(/-/gu, '').replace(/_/gu, '')
  }
  return existingFunc
}

const _isPropertyStatement = (obj: any): obj is DynamoPropertyStatement => {
  return get(obj, 'type', '') === 'property'
}

const queryBuilder =
  ({ createUniqueId }: { createUniqueId?: (s: any) => string }) =>
  (tableName: string, queryData: OrmQuery) => {
    const idGenerator = _idGenerator(createUniqueId)
    const properties = queryData.properties
    const page = queryData.page

    const flowObjs: DynamoOrmStatement[] = queryData.chain.map(x => ({
      ...x,
      myUniqueId: idGenerator(x),
    }))
    const realProperties: DynamoPropertyStatement[] = flowObjs
      .filter(_isPropertyStatement)
      .map(x => x as DynamoPropertyStatement)

    const startKey = page
      ? {
          ExclusiveStartKey: page,
          FilterExpression: undefined,
          ExpressionAttributeNames: undefined,
          ExpressionAttributeValues: undefined,
        }
      : {}

    if (Object.keys(properties).length < 1) {
      return {
        ...startKey,
        TableName: tableName,
      }
    }

    const propKeyToKey: { [s: string]: string } = realProperties.reduce(
      (acc, obj) => {
        return merge(acc, {
          [obj.myUniqueId]: `my${obj.myUniqueId
            .replace('-', '')
            .replace('_', '')}`,
        })
      },
      {}
    )

    const propNametoExpressionAttribute: { [s: string]: string } =
      realProperties.reduce((acc, obj) => {
        const newKey = `#my${obj.myUniqueId.replace('-', '').replace('_', '')}`
        return merge(acc, { [obj.myUniqueId]: newKey })
      }, {})

    const expressionAttributeNames = realProperties.reduce((acc, obj) => {
      return merge(acc, {
        [propNametoExpressionAttribute[obj.myUniqueId]]: obj.name,
      })
    }, {})

    const _getEqualitySymbol = (flowObj: DynamoOrmStatement) => {
      return get(flowObj, 'options.equalitySymbol')
    }

    // I broke this out into its own function, because typescript was having a really hard time with it.
    const _combineStatementAndGetPreviousOrm = (
      acc: string,
      previous: DynamoOrmStatement | undefined,
      flowObj: DynamoOrmStatement
    ): [string, DynamoOrmStatement | undefined] => {
      if (flowObj.type === 'property') {
        const key = flowObj.myUniqueId
        const expressionAttribute = propNametoExpressionAttribute[key]
        const propKey = propKeyToKey[key]
        if (previous && _isPropertyStatement(flowObj)) {
          if (previous.type !== 'and' && previous.type !== 'or') {
            return [
              acc +
                ` AND ${expressionAttribute} ${_getEqualitySymbol(flowObj)} :${propKey}`,
              flowObj,
            ]
          }
          return [
            acc +
              `${expressionAttribute} ${_getEqualitySymbol(flowObj)} :${propKey}`,
            flowObj,
          ]
        }
        return [
          acc +
            `${expressionAttribute} ${_getEqualitySymbol(flowObj)} :${propKey}`,
          flowObj,
        ]
      } else if (flowObj.type === 'and') {
        if (previous && previous.type !== 'property') {
          throw new Error(
            `Cannot preclude and/or with anything except a property`
          )
        }
        return [acc + ' AND ', flowObj]
      } else if (flowObj.type === 'or') {
        if (previous && previous.type !== 'property') {
          throw new Error(
            `Cannot preclude and/or with anything except a property`
          )
        }
        return [acc + ' OR ', flowObj]
      }
      return [acc, flowObj]
    }

    const _createFilterExpression = (): string => {
      return flowObjs.reduce(
        (
          [acc, previous]: [string, DynamoOrmStatement | undefined],
          flowObj: DynamoOrmStatement
        ) => {
          return _combineStatementAndGetPreviousOrm(acc, previous, flowObj)
        },
        ['', undefined]
      )[0]
    }

    const filterExpression = _createFilterExpression()

    const _getStringValue = (value: any) => {
      return value === null || value === undefined ? '' : value
    }

    const DATA_TYPE_TO_METHOD = {
      [DATA_TYPES.STRING]: _getStringValue,
      [DATA_TYPES.NUMBER]: identity,
      [DATA_TYPES.BOOLEAN]: identity,
      [DATA_TYPES.NULL]: identity,
      [DATA_TYPES.ARRAY]: identity,
      [DATA_TYPES.OBJECT]: identity,
    }

    const expressionAttributeValues = realProperties.reduce((acc, obj) => {
      const dataType = ORM_TYPE_TO_DYNAMO_TYPE[obj.valueType]
      const valueMethod = DATA_TYPE_TO_METHOD[dataType]
      const value = valueMethod(obj.value)
      return merge(acc, {
        [`:${propKeyToKey[obj.myUniqueId]}`]: value,
      })
    }, {})

    return {
      ...startKey,
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }
  }

export default queryBuilder
