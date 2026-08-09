export function assertAiUsageEventListener(
  listener
) {
  if (
    listener !== null &&
    listener !== undefined &&
    typeof listener !== "function"
  ) {
    throw new Error(
      "onAiUsageEvent musi być funkcją."
    );
  }
}

export async function notifyAiUsageEvent({
  listener,
  event,
}) {
  if (!listener) {
    return;
  }

  try {
    await listener(event);
  } catch (error) {
    console.error(
      "Failed to notify OpenAI usage listener:",
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
}
