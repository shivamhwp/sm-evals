# supermemory evals

structure:

/locomo_data : contains the locommo conversation dataset.

/pymetrics : contains a fast-api python web server implementation which takes the generated answer and the ground truth embeddings from the getmetrics and returns the metrics. (mainly using nltk and scikit-learn) [not needed right now.]

/src : contains the whole typescript implementation of evals.

- /api - handles the addition and searching of memories.
- /data - temp files needed for running scripts like delete-mems etc.
- /types - contains types.
- /scripts - contains the scripts to load and delete memories from supermemory.
- /evaluation => this contains all the juicy stuff which we currently use to calculate metrics.
  - /search - contains the code to retrieve requested data from the /search endpoint and
  - semanticmetrics.ts - calculating the metrics and stuff.
  - searchutils.ts - helper functions to generate answer from the given data and then using that data, generate embeddings to compare the two.
