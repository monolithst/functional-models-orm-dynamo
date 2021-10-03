const AWS = require('aws-sdk')

const dynamoClient = ({ tableName, dynamoOptions }) => {
  const docClient = new AWS.DynamoDB.DocumentClient(dynamoOptions)

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
