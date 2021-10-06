const assert = require('chai').assert

describe('/src/index.js', () => {
  it('should load without exception', () => {
    assert.doesNotThrow(() => {
      require('../../src')
    })
  })
})
