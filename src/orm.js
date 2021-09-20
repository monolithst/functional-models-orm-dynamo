const { orm } = require('functional-models-orm')
const createDatastoreProvider = require('./datastoreProvider')


const dynamoOrm = ({ dynamoConnection, getTableNameForModel=null}) => {
  const datastoreProvider = createDatastoreProvider({ connection: dynamoConnection, getTableNameForModel})
  return orm({
    datastoreProvider,
  })
}

module.exports = dynamoOrm
