# supermemory evals

eval pipeline arch
![eval pipeline arch](https://ypazyw0thq.ufs.sh/f/38t7p527clgqo22VgcQ8ankEhq9Rw0ur6xpgAG3tTCLNQ8eP)
<br>

structure:

`/locomo_data` : contains the locommo conversation dataset. [learn more here](https://github.com/shivamhwp/sm-evals/blob/main/assets/what.md)

`/pymetrics` : contains a fast-api python web server implementation which takes the generated answer and the ground truth embeddings from the getmetrics and returns the metrics. (mainly using nltk and scikit-learn) [not needed right now.]

`/src` : contains the whole typescript implementation of evals.

- `/api` - handles the addition and searching of memories.
- `/data` - temp files needed for running scripts like `delete-mems` etc.
- `/types` - contains types.
- `/scripts` - contains the scripts to load and delete memories from supermemory.
- `/evaluation` => this contains all the juicy stuff which we currently use to calculate metrics.
  - `/search` - contains the code to retrieve requested data from the `/search` endpoint and
  - `semanticmetrics.ts` - calculating the metrics and stuff.
  - `searchutils.ts` - helper functions to generate answer from the given data and then using that data, generate embeddings to compare the two.

<br>

### faqs

<br>
1. is it fully done ?

no, because me and shreyans are making changes to the backend before testing it on data, coz the genreated answer is sometimes empty so we need to add it to the backend so that we can just test the results which can be true measure of the accuracy.

2. what is it calculating ?

   per question the semantic similarity is calculated and on the whole dataset we calculate the recall, precision, f1, bleu etc. etc.

3. how are we testing ?

   - right now we are only testing the retrieval capability of the text and not the vids, audio etc.

   here are the steps

   - the dataset containing the conversation is uploaded to supermemory(only once.)
   - once the upload is done. we need to test the relevant info retrieval capability of sm.
   - using questions defined in the locomo10.json file, we iterate through them and ask for answers to the questions.
   - the supermemory be sends the most relevant data(i.e the parts of their convo) to the user.
   - we upload them as context to the llm and also the question from the dataset we want the answer to and the that llm generates the answer.
   - to compare the similarity between the answers we first convert them into embeddings and then comapre their cosine similarity(using ai-sdk from vercel).
   - all of this data is printed to the terminal.

4. any insights currently ?

   - the most fast process of all in the whole pipelin is retrieval. +++

<br>

### improvements/changes coming in the future.

1. after the implementation of backend with shreyans. we will be testing it. there will be no need for generate answers with llm. which will make the pipeline faster and more accurate.
2. have the lengths of the ground truths and the generates answer similar to get better semantic similarity. [https://g.co/gemini/share/0dc7950e1cc5](https://g.co/gemini/share/0dc7950e1cc5)
