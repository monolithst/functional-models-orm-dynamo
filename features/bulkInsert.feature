Feature: Bulk Inserting Records

  Scenario: Can Bulk Insert a Model
    Given orm using the DynamoDatastore 
    And the orm is used to create Model1 
    And the datastore is emptied of models
    When 20 instances of the model are created with BulkModelData1
    And bulkInsert is called on the model
    And we poll for 20 seconds for 20 results with BulkSearchQuery1

  Scenario: Can Bulk Insert more than 25 Models, the Threshold of 25 batches
    Given orm using the DynamoDatastore 
    And the orm is used to create Model1 
    And the datastore is emptied of models
    When 100 instances of the model are created with BulkModelData1
    And bulkInsert is called on the model
    And we poll for 20 seconds for 100 results with BulkSearchQuery1

