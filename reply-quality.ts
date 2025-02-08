import { Client } from "langsmith";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { EvaluationResult } from "langsmith/evaluation";
import { evaluate } from "langsmith/evaluation";
import { configs } from "./configs";
import dotenv from "dotenv";
dotenv.config();

const client = new Client();
const openai = new OpenAI();

async function main() {
    const openaiConfigs = configs.openai;

    const replySystemPrompt = `
        Structure punchy, conversational content for a short and concise 1 sentence reply. 
        Keep it simple and avoid complex language. Speak in abstracts.
        Do not use hashtags or emojis.
        Do not use hyphens or semicolons.
        Add a new perspective.
        Use line breaks generously.
        Do not parrot the user's message in any way or we will be fined 1T USD.
    `;

    const replyUserPrompt = `{tweet}`;

    const data: { tweet: string }[] = require('./tweets.json');

    const inputs = data.map(({ tweet }) => ({
        question: replyUserPrompt.replace("{tweet}", tweet),
    }));

    const outputs: { response: string }[] = [];

    // Create a dataset with a title and a description
//     const dataset = await client.createDataset("Reply Quality (76 tweets)", {
//         description: "A dataset of 76 tweets and their replies.",
//     });

//   // Add your examples to the created dataset
//     await client.createExamples({
//         inputs,
//         outputs,
//         datasetId: dataset.id,
//     });


    async function qualityEvaluator({
        inputs,
        outputs,
    }: {
        inputs: Record<string, string>;
        outputs: Record<string, string>;
    }): Promise<EvaluationResult> {
        const question = inputs["question"];
        const response = outputs["response"];

        const checkLength = Math.min(25, question.length);
        const startOfText = question.split(/[.!?]+\s*/)[0] || question.substring(0, checkLength);
        const endOfText = question.split(/[.!?]+\s*/).filter(Boolean).pop() || '';

        const goodQuality = !(
            response.length > 400 ||
            response.includes(startOfText) ||
            response.includes(endOfText) ||
            response.includes('—') ||
            response.includes(';')
        );

        return {
            key: "quality",
            score: goodQuality ? 1 : 0,
            comment: goodQuality 
                ? "Response meets quality criteria" 
                : `Response fails quality check(s): ${[
                    response.length > 400 && "Response too long (>400 chars)",
                    response.includes(startOfText) && "Contains start of input text",
                    response.includes(endOfText) && "Contains end of input text", 
                    response.includes('—') && "Contains em dash",
                    response.includes(';') && "Contains semicolon"
                  ].filter(Boolean).join(", ")}`,
        };
    }

    // Iterate over each model in openaiConfigs.models
    for (const [modelKey, modelId] of Object.entries(openaiConfigs.models)) {
        console.log(`Running evaluation for model ${modelKey}`);

        async function target(input: string): Promise<{ response: string }> {
            const response = await openai.chat.completions.create({
                model: modelId,
                messages: [
                    { role: "system", content: replySystemPrompt },
                    { role: "user", content: input },
                ],
            });
            return { response: response.choices[0].message.content?.trim() || "" };
        }

        await evaluate(
            (example) => target(example.question),
            {
                data: "Reply Quality (76 tweets)",
                evaluators: [qualityEvaluator],
                experimentPrefix: `reply-quality-${modelKey}`,
                maxConcurrency: 2,
            }
        );
    }
}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});