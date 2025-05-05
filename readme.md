### running locomo benchmark on supermemory

<!-- resources :

we can also run other benchmarks :

1. https://chatgpt.com/s/dr_681676cac3548191a1e83b2e015e2611
2. https://grok.com/share/bGVnYWN5_a50d0ff5-c347-4f2d-baa3-72d8d345b45d -->

# how was the locomo benchmark done on other ai models.

## 3 tasks

### qa

the dataset contains 5 type of questions to test different reasoning levels

single hop - (answerable from a single spot in the chat)

multi hop - needing info from multiple spots in the convo.

temporal - testing the understanding of time.

open-domain - requiring ai to blend conversational info with general world knowledge.

adversial - tricky, unanswerable to test robustness.

metrics used : f1 score, recall.

### event summarization

based on the dialog generate the summary of a agent's lifetime for a specific time period and to test it they compare it with the agent's ground truth temporal event graph.

(very different from simple text summarization coz time,relationships etc are involved.)

metric used [fact score](https://arxiv.org/abs/2305.14251). using a process and using f1 score after that to calculate whether the ai system we are testing go it right not just the similar words.

### multimodal dialog generation.( mdg )

consistency across text and visuals.

metrics used : mm relevance(how well the generated chat matched the original) and other nlg metrics. testing text and image coherence.

---

## findings from the locomo benchmark by the snap team i guess.

1. long context showed improvements but not that much. in [ qa ].

2. long context also struggled with adversial questions. in [ qa ].

3. context helps keeping multimodal chat on track and relevant. [ mdg ]

4. mm relevance decreased as the history got longer. using rag helped here a bit like retrieving observatoins. [ mdg ]

---

### limitations to the study :

1. being overviewed by people, it's still machine generated. so it's a little different from normal conversations.

2. the multimodal dialog generation stuff is pretty limited also.
