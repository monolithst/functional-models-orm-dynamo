import { Model } from 'functional-models/interfaces'
import { assert } from 'chai'
import sinon from 'sinon'
import {
  getTableNameForModel,
  splitArrayIntoArraysOfMaxSize,
} from '../../src/utils'

const buildModel = (name: string): Model<any> => {
  return {
    getName: () => name,
  } as Model<any>
}

describe('/src/utils.ts', () => {
  describe('#splitArrayIntoArraysOfMaxSize()', () => {
    it('should throw an exception if the input is not an array', () => {
      assert.throws(() => {
        splitArrayIntoArraysOfMaxSize('input', 2)
      })
    })
    it('should split an array of 10, into 5 sets of 2', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const actual = splitArrayIntoArraysOfMaxSize(input, 2)
      const expected = [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
        [9, 10],
      ]
      assert.deepEqual(actual, expected)
    })
    it('should split an array of 11, into 5 sets of 2 and 1 set of 1', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      const actual = splitArrayIntoArraysOfMaxSize(input, 2)
      const expected = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11]]
      assert.deepEqual(actual, expected)
    })
  })
  describe('#getTableNameForModel()', () => {
    it('should return "my-table" for "My_Table"', () => {
      const actual = getTableNameForModel(buildModel('My_Table'))
      const expected = 'my-table'
      assert.deepEqual(actual, expected)
    })
    it('should return "my-table" for "My Table"', () => {
      const actual = getTableNameForModel(buildModel('My Table'))
      const expected = 'my-table'
      assert.deepEqual(actual, expected)
    })
    it('should return "my-table" for "my-table"', () => {
      const actual = getTableNameForModel(buildModel('my-table'))
      const expected = 'my-table'
      assert.deepEqual(actual, expected)
    })
    it('should return "mytable" for "MyTable"', () => {
      const actual = getTableNameForModel(buildModel('MyTable'))
      const expected = 'mytable'
      assert.deepEqual(actual, expected)
    })
  })
})
