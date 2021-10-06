const assert = require('chai').assert
const sinon = require('sinon')
const { getTableNameForModel } = require('../../src/utils')

const buildModel = name => {
  return {
    getName: () => name,
  }
}

describe('/src/utils.js', () => {
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
