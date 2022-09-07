import { get } from 'lodash'
import { assert } from 'chai'
import sinon from 'sinon'
import { ormQueryBuilder } from 'functional-models-orm/ormQuery'
import { EQUALITY_SYMBOLS, ORMType } from 'functional-models-orm/constants'
import queryBuilder from '../../src/queryBuilder'

const _nameId = () => ({ createUniqueId: (obj: any) => obj.name})

describe('/src/queryBuilder.ts', () => {
  describe('#()', () => {
    it('should set TableName to what is passed in', () => {
      const query = ormQueryBuilder().property('name', 'value').compile()
      const actual = get(queryBuilder(_nameId())('my-table', query), 'TableName')
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
      const actual = get(queryBuilder(_nameId())('my-table', query), 'TableName')
      const expected = 'my-table'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected FilterExpression for a single property', () => {
      const query = ormQueryBuilder().property('name', 'value').compile()
      const actual = queryBuilder(_nameId())('my-table', query).FilterExpression
      const expected = '#myname = :myname'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected FilterExpression for a single property with a > symbol', () => {
      const query = ormQueryBuilder().property('name', 5, { type: ORMType.number, equalitySymbol: EQUALITY_SYMBOLS.GT}).compile()
      const actual = queryBuilder(_nameId())('my-table', query).FilterExpression
      const expected = '#myname > :myname'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected FilterExpression for a single property when the name has a dash', () => {
      const query = ormQueryBuilder().property('name-name', 'value').compile()
      const actual = queryBuilder(_nameId())('my-table', query).FilterExpression
      const expected = '#mynamename = :mynamename'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected FilterExpression for two properties', () => {
      const query = ormQueryBuilder()
        .property('name', 'value')
        .property('secondname', 'value')
        .compile()
      const actual = queryBuilder(_nameId())('my-table', query).FilterExpression
      const expected = '#myname = :myname AND #mysecondname = :mysecondname'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected FilterExpression for two properties with an AND', () => {
      const query = ormQueryBuilder()
        .property('name', 'value')
        .and()
        .property('secondname', 'value')
        .compile()
      const actual = queryBuilder(_nameId())('my-table', query).FilterExpression
      const expected = '#myname = :myname AND #mysecondname = :mysecondname'
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected FilterExpression for two properties with an OR', () => {
      const query = ormQueryBuilder()
        .property('name', 'value')
        .or()
        .property('secondname', 'value')
        .compile()
      const actual = queryBuilder(_nameId())('my-table', query).FilterExpression
      const expected = '#myname = :myname OR #mysecondname = :mysecondname'
      assert.deepEqual(actual, expected)
    })
    it('should throw an exception if two OR are called', () => {
      const query = ormQueryBuilder()
        .property('name', 'value')
        .or()
        .or()
        .property('secondname', 'value')
        .compile()
      try {
        const actual = queryBuilder(_nameId())('my-table', query).FilterExpression
        throw new Error(`No exception thrown`)
      } catch {
      }
    })
    it('should throw an exception if two AND are called', () => {
      const query = ormQueryBuilder()
        .property('name', 'value')
        .and()
        .and()
        .property('secondname', 'value')
        .compile()
      try {
        const actual = queryBuilder(_nameId())('my-table', query).FilterExpression
        throw new Error(`No exception thrown`)
      } catch {
      }
    })
    it('should produce an expected ExpressionAttributeNames for a single property when the name has a dash', () => {
      const query = ormQueryBuilder().property('name-name', 'value').compile()
      const actual = queryBuilder(_nameId())('my-table', query).ExpressionAttributeNames
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
      const actual = queryBuilder(_nameId())('my-table', query).ExpressionAttributeNames
      const expected = {
        '#myname': 'name',
        '#mydescription': 'description',
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected ExpressionAttributeValues for one property', () => {
      const query = ormQueryBuilder().property('name', 'value').compile()
      const actual = queryBuilder(_nameId())('my-table', query).ExpressionAttributeValues
      const expected = {
        ':myname': 'value',
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected ExpressionAttributeValues for one property that has a null value', () => {
      const query = ormQueryBuilder().property('name', null).compile()
      const actual = queryBuilder(_nameId())('my-table', query).ExpressionAttributeValues
      const expected = {
        ':myname': "",
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected ExpressionAttributeValues for two properties with one being null', () => {
      const query = ormQueryBuilder()
        .property('name', 'value')
        .property('other', null)
        .compile()
      const actual = queryBuilder(_nameId())('my-table', query).ExpressionAttributeValues
      const expected = {
        ':myname': 'value',
        ':myother': "",
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected search when no properties are provided', () => {
      const query = ormQueryBuilder().compile()
      const actual = queryBuilder(_nameId())('my-table', query)
      const expected = {
        TableName: 'my-table',
      }
      assert.deepEqual(actual, expected)
    })
    it('should produce an expected search when no properties are provided but there is a page', () => {
      const query = ormQueryBuilder().pagination({ custom: 'page' }).compile()
      const actual = queryBuilder(_nameId())('my-table', query)
      const expected = {
        TableName: 'my-table',
        ExclusiveStartKey: { custom: 'page' },
        ExpressionAttributeNames: undefined,
        ExpressionAttributeValues: undefined,
        FilterExpression: undefined,
      }
      assert.deepEqual(actual as object, expected as object)
    })
  })
})
