const { getTableNameForModel } = require('./utils')
const dynamoClient = require('./dynamoClient')

const dynamoDatastoreProvider = ({
  dynamoOptions,
  getTableNameForModel = getTableNameForModel,
}) => {
  const search = (model, ormQuery) => {
    return Promise.resolve().then(() => {
      const tableName = getTableNameForModel(model)
      const client = dynamoClient({ tableName, dynamoOptions })
      // TODO: Not implemented
      throw new Error(`NOT IMPLEMENTED`)
    })
  }

  const retrieve = (model, id) => {
    return Promise.resolve().then(() => {
      const tableName = getTableNameForModel(model)
      const client = dynamoClient({ tableName, dynamoOptions })
      return client.get({ key: { id } })
    })
  }

  const save = async instance => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.meta.getModel())
      const client = dynamoClient({ tableName, dynamoOptions })
      const data = await instance.functions.toObj()
      await client.update({ key: { id: data.id }, item: data })
      return instance.meta.getModel().create(data)
    })
  }

  const deleteObj = instance => {
    return Promise.resolve().then(async () => {
      const tableName = getTableNameForModel(instance.meta.getModel())
      const client = dynamoClient({ tableName, dynamoOptions })
      const id = await instance.getId()
      return client.delete({ key: { id } })
    })
  }

  return {
    search,
    retrieve,
    save,
    delete: deleteObj,
  }
}

module.exports = dynamoDatastoreProvider
