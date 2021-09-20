const { getTableNameForModel } = require('./utils')
const dynamoClient = require('./dynamoClient')

const dynamoDatastoreProvider = ({ connection, getTableNameForModel=getTableNameForModel}) => {

  const search = (model, ormQuery) => {
    return Promise.resolve()
      .then(() => {
        const tableName = getTableNameForModel(instance)
        const client = dynamoClient({ tableName, connection })
        // TODO: Not implemented
        throw new Error(`NOT IMPLEMENTED`)
      })
  }

  const retrieve = (model, id) => {
    return Promise.resolve()
      .then(() => {
        const tableName = getTableNameForModel(instance)
        const client = dynamoClient({ tableName, connection })
        return client.get({ key: { id } })
      })
  }

  const save = async (instance) => {
    return Promise.resolve()
      .then(() => {
        const tableName = getTableNameForModel(instance)
        const client = dynamoClient({ tableName, connection })
        const data = await instance.functions.toObj()
        await client.update({ key: { id }, item: data })
        return instance.meta.getModel().create(data)
      })
  }

  const deleteObj = instance => {
    return Promise.resolve()
      .then(() => {
        const tableName = getTableNameForModel(instance)
        const client = dynamoClient({ tableName, connection })
        const id = await instance.getId()
        return client.delete({ key: { id } })
      })
  }

  return {
    search,
    retrieve,
    save,
    delete: deleteObj
  }
}

module.exports = dynamoDatastoreProvider