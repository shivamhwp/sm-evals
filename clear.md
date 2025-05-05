we'll go one by one.

first we'll implement the recall metric.
then precision
the f1
then bleu
then others one by one.

the we make performance optimisations.

after locomo this might be a good benchmark
[https://github.com/xiaowu0162/LongMemEval](https://github.com/xiaowu0162/LongMemEval)

--- below is temp ====

You can use a lightweight Python web framework like Flask or FastAPI within your py-metrics project.
Create an endpoint (e.g., /calculate_metrics).
Your TypeScript code would make an HTTP POST request to this endpoint, sending the necessary data (perhaps as JSON in the request body).
The Python API endpoint would receive the data, perform the calculations using scikit-learn, etc., and return the results in the HTTP response.
Pros: Standard, flexible, relatively easy to implement, keeps the TS and Python code decoupled.
Cons: Requires running a separate Python server process.
