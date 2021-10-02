

const getTableNameForModel = model => {
  return model.getName().toLowerCase().replace('_', '-').replace(' ', '-')
}

const getTableNameForInstance = modelInstance => {
  return getTableNameForModel(modelInstance.meta.getModel())
}


module.exports = {
  getTableNameForModel,
  getTableNameForInstance,
}
