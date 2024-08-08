import { G4F } from 'g4f';

const g4f = new G4F();

export default async function handler(req, res) {
  try {
    const { region, customValueForStory } = req.body;

    if (!region) {
      return res.status(400).json({ error: 'Region is required' });
    }

    let storyContent = `Create a fairy tale typical for the country specified by the ${region}.\n` +
      'The story should have the following structure:\n' +
      "- Title: Provide a title for the story.\n" +
      '- Beginning: Introduce the main character and the setting, describe their everyday life.\n' +
      '- Middle: Present a conflict or adventure the character faces, develop the plot with interesting events.\n' +
      '- End: Provide a resolution to the conflict and a valuable lesson learned by the character.\n' +
      'Style: Use a storytelling style similar to classic fairy tales like Little Red Riding Hood, Jack and the Beanstalk, or Cinderella.\n' +
      'Dialogues: Include at least three dialogues between characters:\n' +
      '- An introductory dialogue that sets up the conflict or adventure.\n' +
      '- A middle dialogue that helps develop the characters and the plot.\n' +
      '- A concluding dialogue that wraps up the story and delivers the moral lesson.\n' +
      'Characters: Provide detailed descriptions of the main characters, including their appearance and personality traits. Make the characters relatable and engaging for children.\n' +
      'Setting: Give a vivid description of the setting, incorporating elements typical of the specified region. Make the setting come alive for the reader.\n' +
      `Cultural Context: Ensure the story reflects the cultural characteristics, traditions, and fairy tale writing style typical of ${region}. The story should resonate with the mentality and interests of children from ${region} while also being enjoyable for children from other countries.\n` +
      `Additional notes: Convert the JSON name of the country to a common name, and ensure the story does not explicitly mention the country's name.\n` +
      `Please do not ask for additional information about the country or region.\n`;

    if (customValueForStory?.team) {
      storyContent += `The story should revolve around the theme of "${customValueForStory.team}".\n`;
    }
    if (customValueForStory?.heroes) {
      storyContent += `Include a main character named "${customValueForStory.heroes}" as the hero of the story.\n`;
    }
    if (customValueForStory?.events) {
      storyContent += `Incorporate the event "${customValueForStory.events}" as a significant part of the story's conflict or adventure.\n`;
    }

    storyContent += "- Write the story in both English and the native language of ${region}, with the native language version starting with the words: ${region} Language.\n" +
      "- Format the story in JSON with the following structure:\n" +
      "{\n" +
      "  \"title\": \"Story Title\",\n" +
      "  \"paragraphs\": [\n" +
      "    {\"paragraph\": \"First paragraph.\"},\n" +
      "    {\"paragraph\": \"Second paragraph.\"},\n" +
      "    ...\n" +
      "  ]\n" +
      "}\n" +
      "Please do not ask for additional information about the country or region.";

    const messages = [
      {
        role: 'user',
        content: storyContent,
      }
    ];

    const response = await g4f.chatCompletion(messages, {
      model: 'text-davinci-003'
    });
    console.log(response, 'response')
    let story;
    try {
      story = JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse JSON response from G4F:', response);
      return res.status(500).json({ error: 'Failed to parse story content' });
    }

    const storyTitle = story.title;

    const modelVersion = '2.3';
    const imageResp = await fetch(
      `https://engine.prod.bria-api.com/v1/text-to-vector/base/${modelVersion}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_token: '3c773613bb374f37a173149b171a580c'
        },
        body: JSON.stringify({
          prompt: `An illustration for the fairy tale titled "${storyTitle}"`,
          //prompt: `An illustration for the fairy tale titled "${storyTitle}", inspired by the cultural and artistic style of the ${region} region. Include traditional colors, patterns, and any distinctive elements associated with ${region} to make the illustration more authentic.`,
          num_results: 1,
          sync: true
        })
      }
    );

    const imageData = await imageResp.json();
    if (!imageData.result || !Array.isArray(imageData.result) || imageData.result.length === 0) {
      console.error('No image results from Bria API:', imageData);
      return res.status(500).json({ error: 'Failed to generate image' });
    }

    story.imageUrl = imageData.result[0].urls[0];
    res.status(200).json(story);

  } catch (error) {
    console.error('Error fetching chat completion:', error);
    res.status(500).json({ error: error.message });
  }
}
