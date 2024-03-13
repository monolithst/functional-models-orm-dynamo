import { Model } from 'functional-models/interfaces'

const getTableNameForModel = (model: Model<any>) => {
  return model.getName().toLowerCase().replace('_', '-').replace(' ', '-')
}

export { getTableNameForModel }
