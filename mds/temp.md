### resources on making the comaprision and metrics even better.

> all these are important improvements which i should make.

1. preprocessing or like stemming/lemmatization using stemmer/natural lib.

2. instead of comparing tokens using Levenshtein distance (character edits), compare them based on the similarity of their word embeddings.

3. using standard metrics like ROGUE, BLEU and METEOR.

---

### resources on implementing referencing.

> below are the methods we can use to implement reasoning into the supermemory backend.

1. using chain-of-thought(COT)prompting, where the model is guided to break down the reasoning into intermediate steps. can be used for multihop reasoning required to synthesize info from different documents. tree of thought (TOT) extends this even more.

2. prompt chaining or multi-step sequence like one of the method is map-reduce i.e ask the model to extract facts first and then combine it. using libs like langraph and langchain.

3. source attribution and answer formatting.

4. using nlp pipeline for metadata extraction using tools like [spacy](https://spacy.io) and making a synthesis engine that figures out entity linking , event resolution etc.

   > we doing this.

5. using knowledge graph can represent and query complex relationships.

6. integrating a llm for inference and temporal reasoning.

### things to like consider

1. modern llms aren't very good and experience a degradation of perf. while reasoning over large contexts, while vector dbs excel at this like retrieving documents based on semantic similarity.

2. each way has a tradeoff. directly prompting llms offer flexibility but lack reliability for complex reasoning.

3. CoT and Tot improve accuracy but might increase latency due to multiple llm calls.

4. knowledge graphs offer like much great relational info but like it'll be nightmare to maintain.

5. we can store more data that can be used for referencing

6. using temporal reasoning like resolving "yesterday" with respect to reference date from the metadata.
