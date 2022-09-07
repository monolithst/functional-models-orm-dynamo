# Functional Models ORM Dynamo 

![Unit Tests](https://github.com/monolithst/functional-models-orm-dynamo/actions/workflows/ut.yml/badge.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/monolithst/functional-models-orm-dynamo/badge.svg?branch=master)](https://coveralls.io/github/monolithst/functional-models-orm-dynamo?branch=master)


## Run Feature Tests
To run the feature tests, you need to set up an actual Dynamodb table within AWS and then call cucumber lik the following:

```npm run feature-tests -- --world-parameters '{"awsRegion":"YOUR_REGION", "testTable":"YOUR_TEST_TABLE"}'```

IMPORTANT WORD OF CAUTION: I would not attempt to use this table for anything other than this feature tests, as the table is completely deleted without remorse.
