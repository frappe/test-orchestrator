### Simple Test Orchestrator
Made for parallel execution of unit tests in [Frappe](https://github.com/frappe/frappe) & [ERPNext](https://gihub.com/frappe/erpnext)

#### Endpoints:

**Note:** Each endpoint requires and validates for `CI_BUILD_ID` (unique ID of each build of CI) and `CI_INSTANCE_ID` (unique ID of Instance in which parallel tests are running) headers.  

#### Register Test Instance
Before Initializing test, a test instance needs to register itself to the orchestrator with the list of all possilble test to execute.
* **URL**

  ```url
  GET /register-instance
  ```
* **URL Params**

  Required:
  ```
  test_spec_list=[ARRAY]
  ```
 

#### Get Next Test
Once the instance is registered, a test instance can query for next text based on availability. Orchestrator will return one test to execute from the registered test list

* **URL**

  ```url
  GET /get-next-test-spec
  ```
