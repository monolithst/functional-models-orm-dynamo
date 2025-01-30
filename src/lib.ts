import kebabCase from 'lodash/kebabCase'
import { DataDescription, ModelType, ToObjectResult } from 'functional-models'
import { merge } from 'lodash'

const getTableNameForModel = <T extends DataDescription>(
  model: ModelType<T>
) => {
  return kebabCase(model.getName()).toLowerCase()
}

const _recursiveSplitArray = <T>(
  currentArrays: readonly (readonly T[])[],
  currentArray: readonly T[],
  maxSize: number
): readonly (readonly T[])[] => {
  // Grab the first part
  const sliced = currentArray.slice(0, maxSize)
  // Get the last part
  const remaining = currentArray.slice(maxSize)
  // Combine with the current result
  const together = currentArrays.concat([sliced])

  // Exit if there is nothing left
  if (remaining.length < 1) {
    return together
  }

  return _recursiveSplitArray(together, remaining, maxSize)
}

const splitArrayIntoArraysOfMaxSize = <T>(
  array: readonly T[],
  maxSize: number
): readonly (readonly T[])[] => {
  if (!Array.isArray(array)) {
    throw new Error(`Datatype must be array.`)
  }
  return _recursiveSplitArray([], array, maxSize)
}

const fromDynamo = <T extends DataDescription>(
  obj: object
): ToObjectResult<T> => {
  return Object.entries(obj).reduce((acc, [key, obj]) => {
    return merge(acc, { [key]: obj })
  }, {}) as ToObjectResult<T>
}

const buildScanQuery = (table: string, page?: string) => {
  const startKey = page
    ? {
        ExclusiveStartKey: page,
        FilterExpression: undefined,
        ExpressionAttributeNames: undefined,
        ExpressionAttributeValues: undefined,
      }
    : {}

  return {
    ...startKey,
    TableName: table,
  }
}

export {
  getTableNameForModel,
  splitArrayIntoArraysOfMaxSize,
  fromDynamo,
  buildScanQuery,
}
