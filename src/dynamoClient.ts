import { ModelInstanceInputData, FunctionalModel } from 'functional-models/interfaces'

const dynamoClient = ({ tableName, dynamoOptions, AWS }:{ AWS: any, tableName: string, dynamoOptions: object}) => {
  const dynamo = new AWS.DynamoDB(dynamoOptions)
  const docClient = new AWS.DynamoDB.DocumentClient({ service: dynamo })

  const get = async <T extends FunctionalModel>({ key }:{ key: {[s: string]: string}}) => {
    const params = {
      TableName: tableName,
      Key: key,
    }

    return docClient
      .get(params)
      .promise()
      .then((data: any) => data.Item as ModelInstanceInputData<T>)
  }

  const update = async ({ key, item }:{ key: {[s: string]: string}, item: object}) => {
    const params = {
      TableName: tableName,
      Item: { ...item, ...key },
    }

    return docClient.put(params).promise()
  }

  const deleteObj = async ({ key }:{ key: {[s: string]: string}}) => {
    const params = {
      TableName: tableName,
      Key: key,
    }

    return docClient.delete(params).promise()
  }

  return {
    get,
    update,
    delete: deleteObj,
  }
}

export default dynamoClient
