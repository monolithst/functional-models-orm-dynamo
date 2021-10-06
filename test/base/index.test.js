const assert = require('chai').assert

describe('/index.js', () => {
  it('should load without exception', () => {
    assert.doesNotThrow(() => {
      require('../../')
    })
  })
})
