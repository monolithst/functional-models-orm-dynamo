const get = require('lodash/get')
const assert = require('chai').assert
const sinon = require('sinon')
const { ormQueryBuilder } = require('functional-models-orm').ormQuery
const queryBuilder = require('../../src/queryBuilder')

describe('/src/queryBuilder.js', () => {
  describe('#()', () => {
    it('should set TableName to what is passed in', () => {
      const query = ormQueryBuilder().property('name', 'value').compile()
      const actual = get(queryBuilder('my-table', query), 'TableName')
      const expected = 'my-table'
      assert.deepEqual(actual, expected)
    })
    /*
    situations
    null values
    page and no page
    _ in name
    multiple properties and one property
     */
    it('should TableName to what is passed in', () => {
      const query = ormQueryBuilder().property('name', 'value').compile()
      const actual = get(queryBuilder('my-table', query), 'TableName')
      const expected = 'my-table'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected FilterExpression for a single property', () => {
      const query = ormQueryBuilder().property('name', 'value').compile()
      const actual = queryBuilder('my-table', query).FilterExpression
      const expected = '#myname = :myname'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected FilterExpression for a single property when the name has a dash', () => {
      const query = ormQueryBuilder().property('name-name', 'value').compile()
      const actual = queryBuilder('my-table', query).FilterExpression
      const expected = '#mynamename = :mynamename'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected FilterExpression for two properties', () => {
      const query = ormQueryBuilder()
        .property('name', 'value')
        .property('secondname', 'value')
        .compile()
      const actual = queryBuilder('my-table', query).FilterExpression
      const expected = '#myname = :myname AND #mysecondname = :mysecondname'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected ExpressionAttributeNames for a single property when the name has a dash', () => {
      const query = ormQueryBuilder().property('name-name', 'value').compile()
      const actual = queryBuilder('my-table', query).ExpressionAttributeNames
      const expected = {
        '#mynamename': 'name-name',
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected ExpressionAttributeNames for two properties', () => {
      const query = ormQueryBuilder()
        .property('name', 'value')
        .property('description', 'the-description')
        .compile()
      const actual = queryBuilder('my-table', query).ExpressionAttributeNames
      const expected = {
        '#myname': 'name',
        '#mydescription': 'description',
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected ExpressionAttributeValues for one property', () => {
      const query = ormQueryBuilder().property('name', 'value').compile()
      const actual = queryBuilder('my-table', query).ExpressionAttributeValues
      const expected = {
        ':myname': { S: 'value' },
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected ExpressionAttributeValues for one property that has a null value', () => {
      const query = ormQueryBuilder().property('name', null).compile()
      const actual = queryBuilder('my-table', query).ExpressionAttributeValues
      const expected = {
        ':myname': { S: "" },
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected ExpressionAttributeValues for two properties with one being null', () => {
      const query = ormQueryBuilder()
        .property('name', 'value')
        .property('other', null)
        .compile()
      const actual = queryBuilder('my-table', query).ExpressionAttributeValues
      const expected = {
        ':myname': { S: 'value' },
        ':myother': { S: "" },
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected search when no properties are provided', () => {
      const query = ormQueryBuilder().compile()
      const actual = queryBuilder('my-table', query)
      const expected = {
        TableName: 'my-table',
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected search when no properties are provided but there is a page', () => {
      const query = ormQueryBuilder().pagination({ custom: 'page' }).compile()
      const actual = queryBuilder('my-table', query)
      const expected = {
        TableName: 'my-table',
        ExclusiveStartKey: { custom: 'page' },
      }
      assert.deepEqual(actual, expected)
    })
  })
})
