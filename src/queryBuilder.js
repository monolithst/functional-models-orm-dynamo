const merge = require('lodash/merge')
const get = require('lodash/get')

const queryBuilder = (tableName, ormQuery) => {
  const properties = ormQuery.properties
  const page = get(ormQuery, 'page', undefined)

  const startKey = page
    ? {
        ExclusiveStartKey: page,
      }
    : {}

  if (Object.keys(properties).length < 1) {
    return {
      ...startKey,
      TableName: tableName,
    }
  }

  const propKeyToKey = Object.entries(properties).reduce((acc, [key, _]) => {
    const newKey = `my${key}`.replace('-', '').replace('_', '')
    return merge(acc, { [key]: newKey })
  }, {})

  const propNametoExpressionAttribute = Object.entries(properties).reduce(
    (acc, [key, _]) => {
      const newKey = `#my${key}`.replace('-', '').replace('_', '')
      return merge(acc, { [key]: newKey })
    },
    {}
  )

  const expressionAttributeNames = Object.entries(properties).reduce(
    (acc, [key, _]) => {
      return merge(acc, { [propNametoExpressionAttribute[key]]: key })
    },
    {}
  )

  const filterExpression = Object.entries(properties)
    .map(([key, _]) => {
      return `${propNametoExpressionAttribute[key]} = :${propKeyToKey[key]}`
    })
    .join(' AND ')

  const expressionAttributeValues = Object.entries(properties).reduce(
    (acc, [key, partial]) => {
      // TODO: Cannot handle anything but strings
      if (partial.value === null || partial.value === undefined) {
        return merge(acc, { [`:${propKeyToKey[key]}`]: { NULL: true } })
      }
      const value = partial.value
      return merge(acc, { [`:${propKeyToKey[key]}`]: { S: value } })
    },
    {}
  )

  return {
    ...startKey,
    TableName: tableName,
    FilterExpression: filterExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }
}

module.exports = queryBuilder
