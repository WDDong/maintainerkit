export async function maybeAddOpenAiSummary({ plan, event, apiKey, model }) {
  if (!apiKey) {
    return plan;
  }

  const prompt = [
    "You are helping an open source maintainer.",
    "Summarize the maintenance action in three short bullets.",
    "Do not make final decisions for the maintainer.",
    "",
    `Event kind: ${plan.kind}`,
    `Current summary: ${plan.summary}`,
    `Payload title: ${event.issue?.title || event.pull_request?.title || event.release?.name || ""}`
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt
    })
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      ...plan,
      warnings: [...plan.warnings, `OpenAI summary failed: ${response.status} ${text.slice(0, 120)}`]
    };
  }

  const data = await response.json();
  const summary = extractOutputText(data);
  if (!summary) {
    return plan;
  }

  return {
    ...plan,
    comment: `${plan.comment}\n\n## Maintainer summary\n\n${summary}`
  };
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text.trim();
  }

  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}
