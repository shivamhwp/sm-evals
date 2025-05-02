import { locomoData } from "./utils/config";
import { batchAddMemories } from "./api/supermemory";
import type { AddMemoryRequest } from "./types/supermemory";
import type { ConversationData, DialogTurn } from "./types/locomo";

// Extract dialog turns from a conversation
function extractDialogTurns(conversation: ConversationData): {
  dialogTurns: DialogTurn[];
  observations: string[];
  sessionSummaries: string[];
} {
  const dialogTurns: DialogTurn[] = [];
  const observations: string[] = [];
  const sessionSummaries: string[] = [];

  // Extract sessions
  for (const key of Object.keys(conversation.conversation)) {
    // Skip non-session keys
    if (key === "speaker_a" || key === "speaker_b") continue;
    if (!key.startsWith("session_") || key.includes("date_time")) continue;

    const session = conversation.conversation[key];
    if (typeof session === "string") continue;

    // Extract dialog turns from session
    for (const sessionKey of Object.keys(session)) {
      dialogTurns.push(...session[sessionKey]);
    }

    // Add observations
    const observationKey = `${key}_observation`;
    if (conversation.observation[observationKey]) {
      observations.push(conversation.observation[observationKey]);
    }

    // Add session summaries
    const summaryKey = `${key}_summary`;
    if (conversation.session_summary[summaryKey]) {
      sessionSummaries.push(conversation.session_summary[summaryKey]);
    }
  }

  return { dialogTurns, observations, sessionSummaries };
}

// Transform dialog turn to memory format
function dialogTurnToMemory(
  dialogTurn: DialogTurn,
  sampleId: string
): AddMemoryRequest {
  return {
    content: dialogTurn.text,
    metadata: {
      speaker: dialogTurn.speaker,
      dialog_id: dialogTurn.dia_id,
      sample_id: sampleId,
      ...(dialogTurn.img_url && { img_url: dialogTurn.img_url }),
      ...(dialogTurn.blip_caption && { img_caption: dialogTurn.blip_caption }),
    },
  };
}

// Transform observation or summary to memory
function textToMemory(
  text: string,
  type: "observation" | "summary",
  sampleId: string
): AddMemoryRequest {
  return {
    content: text,
    metadata: {
      type,
      sample_id: sampleId,
    },
  };
}

async function loadLocomoData() {
  console.log("Loading Locomo data into Supermemory...");
  console.log(`Found ${locomoData.length} conversations`);

  let totalDialogs = 0;
  let totalObservations = 0;
  let totalSummaries = 0;

  for (let i = 0; i < locomoData.length; i++) {
    const conversation = locomoData[i];
    console.log(
      `Processing conversation ${i + 1}/${locomoData.length} (${
        conversation.sample_id
      })`
    );

    // Extract data from conversation
    const { dialogTurns, observations, sessionSummaries } =
      extractDialogTurns(conversation);

    // Convert to memory format
    const dialogMemories = dialogTurns.map((turn) =>
      dialogTurnToMemory(turn, conversation.sample_id)
    );
    const observationMemories = observations.map((obs) =>
      textToMemory(obs, "observation", conversation.sample_id)
    );
    const summaryMemories = sessionSummaries.map((summary) =>
      textToMemory(summary, "summary", conversation.sample_id)
    );

    // Batch upload memories
    console.log(`Uploading ${dialogMemories.length} dialog turns...`);
    await batchAddMemories(dialogMemories);

    console.log(`Uploading ${observationMemories.length} observations...`);
    await batchAddMemories(observationMemories);

    console.log(`Uploading ${summaryMemories.length} session summaries...`);
    await batchAddMemories(summaryMemories);

    totalDialogs += dialogMemories.length;
    totalObservations += observationMemories.length;
    totalSummaries += summaryMemories.length;
  }

  console.log("\nUpload Summary:");
  console.log(`- Total dialog turns: ${totalDialogs}`);
  console.log(`- Total observations: ${totalObservations}`);
  console.log(`- Total session summaries: ${totalSummaries}`);
  console.log(
    `- Total memories: ${totalDialogs + totalObservations + totalSummaries}`
  );
}

loadLocomoData().catch((error) => {
  console.error("Error loading data:", error);
  process.exit(1);
});
