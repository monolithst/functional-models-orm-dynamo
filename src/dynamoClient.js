const AWS = require('aws-sdk')

const dynamoClient = ({ tableName, dynamoOptions }) => {
  const dynamo = new AWS.DynamoDB(dynamoOptions)
  const docClient = new AWS.DynamoDB.DocumentClient({ service: dynamo })

  const get = async ({ key }) => {
    const params = {
      TableName: tableName,
      Key: key,
    }

    return docClient
      .get(params)
      .promise()
      .then(data => data.Item)
  }

  const update = async ({ key, item }) => {
    const params = {
      TableName: tableName,
      Item: { ...item, ...key },
    }

    return docClient.put(params).promise()
  }

  const deleteObj = async ({ key }) => {
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

module.exports = dynamoClient
