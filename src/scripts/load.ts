import { locomoData } from "../utils/config";
import { batchAddMemories } from "../api/supermemory";
import type { AddMemoryRequest } from "../types/supermemory";
import type { ConversationData, DialogTurn } from "../types/locomo";
import signale from "../utils/logger";

// Define a type for observation/summary data including the session key
interface TextWithKey {
  key: string;
  text: string;
}

// Extract dialog turns from a conversation
function extractDialogTurns(conversation: ConversationData): {
  dialogTurns: DialogTurn[];
  observations: TextWithKey[];
  sessionSummaries: TextWithKey[];
} {
  const dialogTurns: DialogTurn[] = [];
  const observations: TextWithKey[] = [];
  const sessionSummaries: TextWithKey[] = [];
  const sampleId = conversation.sample_id || "unknown_sample"; // Get sample_id for logging

  // Iterate through top-level keys in the conversation object
  for (const sessionKey of Object.keys(conversation.conversation)) {
    // Skip keys that are not actual sessions (e.g., metadata, non-session keys)
    if (sessionKey === "speaker_a" || sessionKey === "speaker_b") continue;
    if (!sessionKey.startsWith("session_") || sessionKey.includes("date_time"))
      continue;

    // Get the content associated with the session key (e.g., conversation.conversation['session_0'])
    const sessionContent = conversation.conversation[sessionKey];

    // Check if sessionContent is directly an array (likely containing DialogTurns)
    if (Array.isArray(sessionContent)) {
      // Assume it's an array of DialogTurn objects
      try {
        // Filter out any non-object elements just in case
        const turns = sessionContent.filter(
          (item): item is DialogTurn =>
            typeof item === "object" &&
            item !== null &&
            typeof item.text === "string" &&
            typeof item.speaker === "string" &&
            typeof item.dia_id === "string"
        );
        if (turns.length !== sessionContent.length) {
          signale.warn(
            `[${sampleId}/${sessionKey}] Filtered out invalid DialogTurn objects from direct array.`
          );
        }
        dialogTurns.push(...turns);
      } catch (e) {
        signale.warn(
          `[${sampleId}/${sessionKey}] Error processing session key which was an array:`,
          e
        );
      }
    }
    // Check if sessionContent is an object (original expected structure)
    else if (
      typeof sessionContent === "object" &&
      sessionContent !== null
      // No need to check Array.isArray here again
    ) {
      // Iterate through the keys within this specific session's content
      // (e.g., keys inside conversation.conversation['session_0'])
      for (const turnKey of Object.keys(sessionContent)) {
        // Get the value associated with the turn key (e.g., conversation.conversation['session_0']['some_turn_key'])
        const potentialTurnsData = sessionContent[turnKey];

        // Expect this data to be an array of DialogTurn objects
        if (Array.isArray(potentialTurnsData)) {
          // If it's an array, assume it contains valid DialogTurn objects and add them
          try {
            // Filter out any non-object/invalid elements just in case
            const turns = potentialTurnsData.filter(
              (item): item is DialogTurn =>
                typeof item === "object" &&
                item !== null &&
                typeof item.text === "string" &&
                typeof item.speaker === "string" &&
                typeof item.dia_id === "string"
            );
            if (turns.length !== potentialTurnsData.length) {
              signale.warn(
                `[${sampleId}/${sessionKey}/${turnKey}] Filtered out invalid DialogTurn objects.`
              );
            }
            dialogTurns.push(...turns);
          } catch (e) {
            signale.warn(
              `[${sampleId}/${sessionKey}/${turnKey}] Error processing turns:`,
              e
            );
          }
        } else {
          // If it's NOT an array, log a warning. The structure is unexpected.
          signale.warn(
            `[${sampleId}/${sessionKey}/${turnKey}] Unexpected data type for turns: Expected array, got ${typeof potentialTurnsData}. Skipping.`
          );
        }
      }
    }
    // Handle other unexpected types (null, string, number, etc.)
    else {
      signale.warn(
        `[${sampleId}/${sessionKey}] Skipping session key due to unexpected main content type: ${typeof sessionContent}`
      );
    }

    // Add observations associated with this sessionKey
    const observationKey = `${sessionKey}_observation`;
    if (conversation.observation && conversation.observation[observationKey]) {
      const observationData = conversation.observation[observationKey];
      // Handle different types of observation data
      if (
        typeof observationData === "string" &&
        observationData.trim() !== ""
      ) {
        // If it's a string, use it directly
        observations.push({
          key: sessionKey,
          text: observationData,
        });
      } else if (
        typeof observationData === "object" &&
        observationData !== null
      ) {
        // If it's an object, it likely contains speaker data with arrays of observations
        try {
          // Convert the object to a meaningful string summary
          const speakerSummaries = [];
          for (const [speaker, items] of Object.entries(observationData)) {
            if (Array.isArray(items)) {
              const speakerPoints = items
                .map((item) =>
                  Array.isArray(item) && item.length > 0
                    ? item[0]
                    : String(item)
                )
                .filter((text) => text && text.trim() !== "")
                .join(". ");

              if (speakerPoints) {
                speakerSummaries.push(`${speaker}: ${speakerPoints}`);
              }
            }
          }

          const observationText = speakerSummaries.join("\n\n");

          if (observationText) {
            // Add to observations
            observations.push({
              key: sessionKey,
              text: observationText,
            });
            signale.log(
              `[${sampleId}/${sessionKey}] Extracted speaker observations successfully.`
            );
          } else {
            // Fallback to stringifying if we couldn't extract meaningful text
            const stringifiedContent = JSON.stringify(observationData);
            observations.push({
              key: sessionKey,
              text: `Raw observation data: ${stringifiedContent}`,
            });
            signale.log(
              `[${sampleId}/${sessionKey}] Used stringified object as fallback.`
            );
          }
        } catch (e) {
          signale.warn(
            `[${sampleId}/${sessionKey}] Failed to process observation object: ${e}`
          );
        }
      } else {
        signale.warn(
          `[${sampleId}/${sessionKey}] Skipping observation with invalid data (type: ${typeof observationData})`
        );
      }
    }

    // Add session summaries associated with this sessionKey
    const summaryKey = `${sessionKey}_summary`;
    if (
      conversation.session_summary &&
      conversation.session_summary[summaryKey]
    ) {
      const summaryData = conversation.session_summary[summaryKey];
      // Handle different types of summary data
      if (typeof summaryData === "string" && summaryData.trim() !== "") {
        // If it's a string, use it directly
        sessionSummaries.push({
          key: sessionKey,
          text: summaryData,
        });
      } else if (typeof summaryData === "object" && summaryData !== null) {
        // If it's an object, it might contain speaker data like observations
        try {
          // Convert the object to a meaningful string summary
          const speakerSummaries = [];
          for (const [speaker, items] of Object.entries(summaryData)) {
            if (Array.isArray(items)) {
              const speakerPoints = items
                .map((item) =>
                  Array.isArray(item) && item.length > 0
                    ? item[0]
                    : String(item)
                )
                .filter((text) => text && text.trim() !== "")
                .join(". ");

              if (speakerPoints) {
                speakerSummaries.push(`${speaker}: ${speakerPoints}`);
              }
            } else if (typeof items === "string" && items.trim() !== "") {
              speakerSummaries.push(`${speaker}: ${items}`);
            }
          }

          const summaryText = speakerSummaries.join("\n\n");

          if (summaryText) {
            // Add to summaries
            sessionSummaries.push({
              key: sessionKey,
              text: summaryText,
            });
            signale.log(
              `[${sampleId}/${sessionKey}] Extracted speaker summaries successfully.`
            );
          } else {
            // Fallback to stringifying if we couldn't extract meaningful text
            const stringifiedContent = JSON.stringify(summaryData);
            sessionSummaries.push({
              key: sessionKey,
              text: `Raw summary data: ${stringifiedContent}`,
            });
            signale.log(
              `[${sampleId}/${sessionKey}] Used stringified object as fallback for summary.`
            );
          }
        } catch (e) {
          signale.warn(
            `[${sampleId}/${sessionKey}] Failed to process summary object: ${e}`
          );
        }
      } else {
        signale.warn(
          `[${sampleId}/${sessionKey}] Skipping summary with invalid data (type: ${typeof summaryData})`
        );
      }
    }
  }

  return { dialogTurns, observations, sessionSummaries };
}

// Transform dialog turn to memory format
function dialogTurnToMemory(
  dialogTurn: DialogTurn,
  sampleId: string
): AddMemoryRequest {
  // Basic validation - Now less critical if extractDialogTurns filters properly,
  // but good as a safeguard.
  if (
    !dialogTurn ||
    typeof dialogTurn.text !== "string" ||
    typeof dialogTurn.speaker !== "string" ||
    typeof dialogTurn.dia_id !== "string"
  ) {
    // This should ideally not happen if filtering in extractDialogTurns works.
    signale.error(
      // Use error maybe? If it gets here, it's unexpected.
      `[${sampleId}] Invalid DialogTurn object reached dialogTurnToMemory:`,
      dialogTurn
    );
    // Return a minimal valid object or throw an error, depending on desired handling.
    // Throwing might be better to halt processing if unexpected data gets through.
    throw new Error(`Invalid DialogTurn encountered for sample ${sampleId}`);
    // Or return fallback:
    // return {
    //   content: "[Invalid Text]",
    //   metadata: {
    //     type: "dialog_turn",
    //     speaker: "[Invalid Speaker]",
    //     dialog_id: "[Invalid ID]",
    //     sample_id: sampleId,
    //   },
    // };
  }

  // Handle img_url correctly - ensure it's a string if present
  let imgUrl = undefined;
  if (dialogTurn.img_url) {
    // If img_url is an array, take the first element
    if (Array.isArray(dialogTurn.img_url) && dialogTurn.img_url.length > 0) {
      imgUrl = dialogTurn.img_url[0];
    }
    // If it's already a string, use it directly
    else if (typeof dialogTurn.img_url === "string") {
      imgUrl = dialogTurn.img_url;
    }
  }

  return {
    content: dialogTurn.text, // No fallback needed if guaranteed valid
    metadata: {
      type: "dialog_turn",
      speaker: dialogTurn.speaker, // No fallback needed
      dialog_id: dialogTurn.dia_id, // No fallback needed
      sample_id: sampleId,
      ...(imgUrl && { img_url: imgUrl }),
      ...(dialogTurn.blip_caption && { img_caption: dialogTurn.blip_caption }),
    },
  };
}

// Transform observation or summary to memory
function textToMemory(
  data: TextWithKey,
  type: "observation" | "summary",
  sampleId: string
): AddMemoryRequest {
  // Basic validation - Now less critical if extractDialogTurns filters properly,
  // but good as a safeguard.
  if (!data || typeof data.text !== "string" || typeof data.key !== "string") {
    // This should ideally not happen now.
    signale.error(
      // Use error
      `[${sampleId}] Invalid TextWithKey object reached textToMemory for type ${type}:`,
      data
    );
    throw new Error(
      `Invalid TextWithKey encountered for sample ${sampleId}, type ${type}`
    );
  }

  return {
    content: data.text, // No fallback needed
    metadata: {
      type,
      sample_id: sampleId,
      session_key: data.key, // No fallback needed
    },
  };
}

async function loadLocomoData() {
  signale.log("Loading Locomo data into Supermemory...");

  // Ensure locomoData is an array before proceeding
  if (!Array.isArray(locomoData)) {
    signale.error("Error: locomoData is not an array. Aborting load.");
    process.exit(1);
    return; // Added return for type safety, although process.exit stops execution
  }

  signale.log(`Found ${locomoData.length} conversations`);

  let totalDialogs = 0;
  let totalObservations = 0;
  let totalSummaries = 0;
  let processedConversations = 0;
  let failedConversations = 0;

  for (let i = 0; i < locomoData.length; i++) {
    const conversation = locomoData[i];

    // Basic check for conversation validity
    if (
      !conversation ||
      typeof conversation !== "object" ||
      !conversation.sample_id
    ) {
      signale.warn(
        `Skipping invalid conversation data at index ${i}. Missing basic structure or sample_id.`
      );
      failedConversations++;
      continue; // Skip to the next conversation
    }

    signale.log(
      `Processing conversation ${i + 1}/${locomoData.length} (${
        conversation.sample_id
      })`
    );

    try {
      // Extract data from conversation
      const { dialogTurns, observations, sessionSummaries } =
        extractDialogTurns(conversation); // Assumes conversation is valid ConversationData

      // Convert to memory format - Filter out any potential nulls/undefined if dialogTurnToMemory could return them
      // Though current implementation provides fallbacks instead of returning null.
      const dialogMemories = dialogTurns.map((turn) =>
        dialogTurnToMemory(turn, conversation.sample_id)
      );
      // .filter((mem): mem is AddMemoryRequest => mem !== null); // Example filter if nulls were returned

      const observationMemories = observations.map((obs) =>
        textToMemory(obs, "observation", conversation.sample_id)
      );
      const summaryMemories = sessionSummaries.map((summary) =>
        textToMemory(summary, "summary", conversation.sample_id)
      );

      // Batch upload memories only if there are memories to upload
      if (dialogMemories.length > 0) {
        signale.log(`Uploading ${dialogMemories.length} dialog turns...`);
        await batchAddMemories(dialogMemories);
        totalDialogs += dialogMemories.length;
      } else {
        signale.log("No valid dialog turns found to upload.");
      }

      if (observationMemories.length > 0) {
        signale.log(`Uploading ${observationMemories.length} observations...`);
        await batchAddMemories(observationMemories);
        totalObservations += observationMemories.length;
      } else {
        signale.log("No valid observations found to upload.");
      }

      if (summaryMemories.length > 0) {
        signale.log(`Uploading ${summaryMemories.length} session summaries...`);
        await batchAddMemories(summaryMemories);
        totalSummaries += summaryMemories.length;
      } else {
        signale.log("No valid session summaries found to upload.");
      }

      processedConversations++;
    } catch (error) {
      signale.error(
        `Error processing conversation ${conversation.sample_id}:`,
        error
      );
      failedConversations++;
      // Decide if you want to continue with the next conversation or stop
      // continue; // Uncomment to continue processing other conversations
    }
  }

  signale.log("\n--- Load Process Summary ---");
  signale.log(`- Total conversations processed: ${processedConversations}`);
  signale.log(`- Total conversations failed/skipped: ${failedConversations}`);
  signale.log("\n--- Upload Summary ---");
  signale.log(`- Total dialog turns uploaded: ${totalDialogs}`);
  signale.log(`- Total observations uploaded: ${totalObservations}`);
  signale.log(`- Total session summaries uploaded: ${totalSummaries}`);
  signale.log(
    `- Total memories uploaded: ${
      totalDialogs + totalObservations + totalSummaries
    }`
  );
}

// Wrap the execution in a main async function for better structure
async function main() {
  try {
    await loadLocomoData();
    signale.log("\nData loading process completed.");
  } catch (error) {
    signale.error("Critical error during data loading:", error);
    process.exit(1);
  }
}

// Execute the main function
main();
