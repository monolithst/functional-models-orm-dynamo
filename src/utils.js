

const getTableNameForModel = model => {
  return model.getName().toLowerCase().replace('_', '-').replace(' ', '-')
}


module.exports = {
  getTableNameForModel
}
