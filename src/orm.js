const { orm } = require('functional-models-orm')
const createDatastoreProvider = require('./datastoreProvider')

const dynamoOrm = ({ dynamoOptions, getTableNameForModel = null }) => {
  const datastoreProvider = createDatastoreProvider({
    dynamoOptions,
    getTableNameForModel,
  })
  return orm({
    datastoreProvider,
  })
}

module.exports = dynamoOrm
