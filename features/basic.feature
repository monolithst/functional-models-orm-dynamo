Feature: Basic Dynamo Functionality

  Scenario: Can CRUD a Model
    Given orm using the DynamoDatastore 
    And the orm is used to create Model1 
    And the datastore is emptied of models 
    When an instance of the model is created with ModelData1
    And save is called on the model
    And the datastore's retrieve is called with values
      | id        | test-id | 
    Then the result matches ModelData1 
    When the datastore's delete is called with modelInstance 
    Then the result matches undefined 

  Scenario: Can Search Models
    Given orm using the DynamoDatastore 
    And the orm is used to create Model1 
    And the datastore is emptied of models 
    When an instance of the model is created with ModelData1
    And save is called on the model
    And the datastore's search is called with SearchQuery1
    Then the result matches SearchResult1

