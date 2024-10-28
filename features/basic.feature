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

  Scenario: Can insert a model that has properties with undefined values
    Given orm using the DynamoDatastore
    And the orm is used to create Model2
    And the datastore is emptied of models
    When an instance of the model is created with ModelData2
    And save is called on the model
    And the datastore's retrieve is called with values
      | id        | test-id |
    Then the result matches StoredModelData2
    When the datastore's delete is called with modelInstance
    Then the result matches undefined

  Scenario: Can insert a model that has a nested property with an undefined value
    Dynamo does not like nested undefined values without additional configuring.
    We need to make sure that we have this configured otherwise it'll cause exceptions.
    Given orm using the DynamoDatastore
    And the orm is used to create Model3
    And the datastore is emptied of models
    When an instance of the model is created with ModelData3
    And save is called on the model
    And the datastore's retrieve is called with values
      | id        | test-id |
    Then the result matches StoredModelData3
    When the datastore's delete is called with modelInstance
    Then the result matches undefined
