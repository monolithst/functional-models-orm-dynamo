# Functional Models ORM Dynamo

![Unit Tests](https://github.com/monolithst/functional-models-orm-dynamo/actions/workflows/ut.yml/badge.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/monolithst/functional-models-orm-dynamo/badge.svg?branch=master)](https://coveralls.io/github/monolithst/functional-models-orm-dynamo?branch=master)
Provides an functional-models datastore adapter for AWS Dynamo.

# Important Notes - Don't Skip

Dynamodb is great for the one thing that its good at (being a key->value store). But any searching is a bad idea.

While this datastore adapter absolutely 100% works and works well in production (from years of experience), it should never ever
be used for searching in production. This isn't a limitation of the adapter, it's a limitation of the datastore itself.

Our implementation of `search` is deliberately unoptimized and will indeed pull the entire database across the wire one section at a time.

`save`, `retrieve`, `bulkInsert`, `delete` work great, but `search` should only be used for <i>limited</i> development purposes.

You have been warned.

## AWS SDK 3.0

This library now supports AWS SDK 3.0 as an injectable library.

## Run Feature Tests

To run the feature tests, you need to set up an actual Dynamodb table within AWS and then call cucumber lik the following:

`npm run feature-tests -- --world-parameters '{"awsRegion":"YOUR_REGION", "testTable":"YOUR_TEST_TABLE"}'`

IMPORTANT WORD OF CAUTION: I would not attempt to use this table for anything other than this feature tests, as the table is completely deleted without remorse.
