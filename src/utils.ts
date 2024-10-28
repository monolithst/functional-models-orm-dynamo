import { Model } from 'functional-models/interfaces'

const getTableNameForModel = (model: Model<any>) => {
  return model.getName().toLowerCase().replace('_', '-').replace(' ', '-')
}

const _recursiveSplitArray = <T>(
  currentArrays: T[][],
  currentArray: T[],
  maxSize: number
): T[][] => {
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
  array: T[],
  maxSize: number
): T[][] => {
  if (!Array.isArray(array)) {
    throw new Error(`Datatype must be array.`)
  }
  return _recursiveSplitArray([], array, maxSize)
}

export { getTableNameForModel, splitArrayIntoArraysOfMaxSize }
