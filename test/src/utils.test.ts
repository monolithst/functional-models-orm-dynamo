import { Model } from 'functional-models/interfaces'
import { assert } from 'chai'
import sinon from 'sinon'
import { getTableNameForModel } from '../../src/utils'

const buildModel = (name: string): Model<any> => {
  return {
    getName: () => name,
  } as Model<any>
}

describe('/src/utils.ts', () => {
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
