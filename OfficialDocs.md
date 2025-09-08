# Official Gemini API Documentation

This section provides key information and code snippets from the [official Google AI documentation](https://ai.google.dev/gemini-api/docs) to help you get started with the Gemini API. For a hands-on approach, check out the [Web developer quickstart](https://ai.google.dev/gemini-api/docs/get-started/web).

## AI Studio Quickstart

[Google AI Studio](https://ai.google.dev/gemini-api/docs/ai-studio-quickstart) is a web-based tool for prototyping with generative models. You can quickly test models and experiment with different prompts. When you're ready, you can export your work as code using the Gemini API.

**To get your API key from AI Studio:**

1.  Open the [AI Studio Quickstart guide](https://ai.google.dev/gemini-api/docs/ai-studio-quickstart) and follow the initial setup steps.
2.  Click **"Get API key"** in the top left of AI Studio.
3.  Create or select a Google Cloud project.
4.  Your API key will be generated. Remember to keep it secure.

---

## Initialization with Node.js

To use the Gemini API in your Node.js application, you need to install the `@google/genai` package and initialize it with your API key.

```ts
// Install the package: npm install @google/genai
import { GoogleGenAI } from "@google/genai";

// IMPORTANT: In a real app, use a secure way to manage your API key.
// This environment has it pre-configured as process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

## Generate Text from Text Inputs

The most common use case is generating text from a text prompt. Use the `gemini-2.5-flash` model for this.

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function run() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Write a story about a magic backpack.',
  });
  console.log(response.text);
}

run();
```

## Generate Text from Image and Text Inputs

The Gemini models are multimodal. You can provide both images and text in your prompt.

**Note:** This requires converting your image to a base64 encoded string.

```ts
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Function to convert file to base64
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

async function run() {
  const imagePart = fileToGenerativePart("image.png", "image/png");
  const textPart = { text: "What is in this picture?" };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });

  console.log(response.text);
}

run();
```

## Chat (Conversational AI)

For multi-turn conversations, it's best to use the chat functionality, which handles conversation history for you.

```ts
import { GoogleGenAI, Chat } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const chat = ai.chats.create({ model: 'gemini-2.5-flash' });

async function run() {
  let response = await chat.sendMessage({ message: "Hello, my name is Bob." });
  console.log("AI: ", response.text);

  response = await chat.sendMessage({ message: "What is my name?" });
  console.log("AI: ", response.text);
}

run();
```