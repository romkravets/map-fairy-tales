import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { region, customValueForStory } = req.body;
    console.log(region, customValueForStory, "region, customValueForStory");

    if (!region) {
      return res.status(400).json({ error: "Region is required" });
    }

    // ─── STORY PROMPT (оновлено) ────────────────────────────────────────────
    let storyContent = `You are a master storyteller specializing in folk tales and fairy tales from around the world.

Your task: Write an immersive, emotionally rich fairy tale deeply rooted in the cultural traditions of the region identified by the code "${region}".

STORY REQUIREMENTS:
- The story must feel like it was written by a native author from that culture — use culturally authentic names, landscapes, foods, customs, and values.
- Do NOT mention the country name explicitly anywhere in the story.
- Convert the JSON region code to the real country/region name internally before writing.

STRUCTURE:
1. **Title** — Evocative and poetic, reflecting the cultural style.
2. **Opening** — Establish the world: vivid setting, introduce the protagonist with their unique personality, appearance, and daily life. Hook the reader immediately with a mysterious or emotionally compelling detail.
3. **Rising Action** — A meaningful conflict or quest begins. Weave in folklore elements (magical creatures, spirits, enchanted objects) typical to this region. Include moments of wonder and danger.
4. **Climax** — A pivotal, emotionally charged moment where the protagonist must make a difficult choice or face their greatest challenge.
5. **Resolution** — A satisfying, culturally resonant ending with a moral lesson delivered naturally through the story, not as a stated proverb.

CHARACTERS:
- Protagonist: Give them a culturally authentic name, distinct appearance, a flaw, and a strength. Make them feel real and relatable to children.
- Supporting characters: At least 2 memorable secondary characters (a wise elder, a trickster, a magical creature, etc.) that reflect regional folklore archetypes.

DIALOGUES (minimum 3, woven naturally into the story):
- Each dialogue must reveal character and advance the plot — avoid exposition dumps.
- Use speech patterns and idioms inspired by the region's storytelling tradition.

ATMOSPHERE:
- Describe the setting with sensory details: sounds, smells, textures, colors typical of that landscape and culture.
- Use metaphors and imagery drawn from regional nature, seasons, and traditions.

LENGTH: Write a full, satisfying story of at least 8–12 paragraphs. Each paragraph should be substantial (4–6 sentences).

`;

    if (customValueForStory?.team) {
      storyContent += `THEME: The central theme of the story must be "${customValueForStory.team}". Weave it throughout organically.\n`;
    }
    if (customValueForStory?.heroes) {
      storyContent += `HERO NAME: The main protagonist must be named "${customValueForStory.heroes}". Build their personality authentically around this name.\n`;
    }
    if (customValueForStory?.events) {
      storyContent += `KEY EVENT: The event "${customValueForStory.events}" must serve as the central conflict or turning point of the story. Make it dramatic and meaningful.\n`;
    }

    storyContent += `
BILINGUAL OUTPUT:
- Write the full story in English first.
- Then write the complete story again in the native language of the region (label this section with: "[Region Language]").

OUTPUT FORMAT — respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "title": "Story Title in English",
  "paragraphs": [
    {"paragraph": "First paragraph text..."},
    {"paragraph": "Second paragraph text..."},
    ...
  ]
}

Each paragraph object must contain one paragraph of the story. Include all English paragraphs first, then all native-language paragraphs (starting with a paragraph that reads "[Region Language]" as a section header). 
Do NOT include any text outside the JSON.`;

    // ─── IMAGE PROMPT (оновлено) ─────────────────────────────────────────────
    const buildImagePrompt = (storyTitle: string, region: string) =>
      `Children's fairy tale book illustration, full color, painterly style inspired by the folk art and visual traditions of the ${region} region. ` +
      `Scene from the story titled "${storyTitle}". ` +
      `Feature a heroic child protagonist in traditional regional clothing standing in a magical, lush landscape typical of ${region} — ` +
      `include authentic architectural details, flora, and cultural patterns as background elements. ` +
      `Warm, enchanting lighting with a sense of wonder and magic. Style reminiscent of classic illustrated fairy tale books — ` +
      `rich colors, detailed backgrounds, expressive characters. No text or letters in the image.`;

    // ─── GROQ API CALL ────────────────────────────────────────────────────────
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are a master storyteller of folk tales and fairy tales. You always respond with valid JSON only, no markdown formatting, no extra commentary.",
            },
            { role: "user", content: storyContent },
          ],
          response_format: { type: "json_object" },
          temperature: 0.9,
          max_tokens: 4096,
        }),
      },
    );

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq API error:", JSON.stringify(groqData));
      return res
        .status(500)
        .json({ error: "Groq API failed", details: groqData });
    }

    const rawContent: string = groqData.choices?.[0]?.message?.content ?? "";
    console.log("Groq raw response:", rawContent.slice(0, 500));

    if (!rawContent) {
      return res.status(500).json({
        error: "Empty response from Groq",
        details: groqData,
      });
    }

    // Strip markdown code fences if model wrapped JSON in ```json ... ```
    const cleanContent = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let story: any;
    try {
      story = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("JSON parse failed. Raw content was:", rawContent);
      return res.status(500).json({
        error: "Failed to parse story JSON",
        raw: rawContent.slice(0, 1000),
      });
    }

    if (!story.title) {
      console.error(
        "Parsed story has no title:",
        JSON.stringify(story).slice(0, 500),
      );
      return res.status(500).json({
        error: "Story title is missing",
        parsed: story,
      });
    }

    if (!Array.isArray(story.paragraphs) || story.paragraphs.length === 0) {
      return res.status(500).json({
        error: "Story paragraphs are missing or empty",
        parsed: story,
      });
    }

    // ─── BRIA IMAGE GENERATION ────────────────────────────────────────────────
    const modelVersion = "2.3";
    const imageResp = await fetch(
      `https://engine.prod.bria-api.com/v1/text-to-image/fast/${modelVersion}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_token: process.env.BRIA_API_KEY || "",
        },
        body: JSON.stringify({
          prompt: buildImagePrompt(story.title, region),
          num_results: 1,
          sync: true,
        }),
      },
    );

    const imageData = await imageResp.json();
    console.log("Bria API response:", imageData);

    if (
      !imageData.result ||
      !Array.isArray(imageData.result) ||
      imageData.result.length === 0
    ) {
      console.error("No image results from Bria API:", imageData);
      return res.status(500).json({ error: "Failed to generate image" });
    }

    story.imageUrl = imageData.result[0].urls[0];

    res.status(200).json(story);
  } catch (error) {
    console.error("Error fetching chat completion:", error);
    res.status(500).json({ error: error });
  }
}
