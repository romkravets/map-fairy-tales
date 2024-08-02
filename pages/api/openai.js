import { G4F } from 'g4f';

const g4f = new G4F();

export default async function handler(req, res) {
  try {
    const messages = [
      { role: 'user', content: 'Create a fairy tale for children.\n' +
          'Fairy tale wants the to be new style.\n' +
          'Other notes Fairy tale has: for iran children\n' +
          'Instead write a Fairy tale that he can use and shere for children!\n' +
          'The fairy tale is mast by that the person can send:' }
    ];

    const response = await g4f.chatCompletion(messages);

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching chat completion:', error);
    res.status(500).json({ error: error.message });
  }
}

