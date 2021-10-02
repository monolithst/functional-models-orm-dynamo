const { getTableNameForModel, getTableNameForInstance } = require('./utils')
const dynamoClient = require('./dynamoClient')

const dynamoDatastoreProvider = ({ connection, getTableNameForModel=getTableNameForModel, getTableNameForInstance=getTableNameForInstance}) => {

  const search = (model, ormQuery) => {
    return Promise.resolve()
      .then(() => {
        const tableName = getTableNameForModel(model)
        const client = dynamoClient({ tableName, connection })
        // TODO: Not implemented
        throw new Error(`NOT IMPLEMENTED`)
      })
  }

  const retrieve = (model, id) => {
    return Promise.resolve()
      .then(() => {
        const tableName = getTableNameForModel(model)
        const client = dynamoClient({ tableName, connection })
        return client.get({ key: { id } })
      })
  }

  const save = async (instance) => {
    return Promise.resolve()
      .then(async () => {
        const tableName = getTableNameForInstance(instance)
        const client = dynamoClient({ tableName, connection })
        const data = await instance.functions.toObj()
        await client.update({ key: { id: data.id }, item: data })
        return instance.meta.getModel().create(data)
      })
  }

  const deleteObj = instance => {
    return Promise.resolve()
      .then(async () => {
        const tableName = getTableNameForInstance(instance)
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
