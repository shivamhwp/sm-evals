after locomo this might be a good benchmark
[https://github.com/xiaowu0162/LongMemEval](https://github.com/xiaowu0162/LongMemEval)

### improvements which we can make:

1. doing parallel processing rather thatn going one by one on every question i.e changing
   generateAnswer() and searchMemories from sequencial to parallet processing.
2. if the sm /search api supports batching multiple search queries, this can be benificial
3. wherever you are making api requests thing about batching stuff or sending concurrent requests.

###things to do in priority :

- [x] changing all the sequentially processed code to parallely processed code which uses concurrency.
- [ ] terminal gui.
- [ ] start working on backend with shreyans.
