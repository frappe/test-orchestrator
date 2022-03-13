## Simple Test Orchestrator
Made for parallel execution of unit tests in [Frappe](https://github.com/frappe/frappe) & [ERPNext](https://gihub.com/frappe/erpnext)

> This is a very basic version of what cypress.io does for it's parallelization


### Endpoints

**Note:** Each endpoint requires `CI_BUILD_ID` (unique ID of the build in CI) and `CI_INSTANCE_ID` (unique ID of instance in which parallel tests are running) headers.  

#### Register a test instance

Before initializing tests, a test instance needs to register itself to the orchestrator with the list of all tests to execute.
* **URL**

  ```url
  GET /register-instance
  ```
* **URL Params**

  Required:
  ```
  test_spec_list=[ARRAY]
  ```
 **Note:** Separate test list is maintained for each build id.

#### Get next test to run
Once the instance is registered, a test instance can ask for next test based on availability. Orchestrator will return one test to execute from the registered test list.

* **URL**

  ```url
  GET /get-next-test-spec
  ```
