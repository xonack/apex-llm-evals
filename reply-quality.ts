import { Client } from "langsmith";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { EvaluationResult } from "langsmith/evaluation";
import { evaluate } from "langsmith/evaluation";
import type { Run } from "langsmith";

import dotenv from "dotenv";
dotenv.config();

const client = new Client();
const openai = new OpenAI();

async function main() {

    const replySystemPrompt = `
        Structure punchy, conversational content for a short and concise 1 sentence reply. 
        Keep it simple and avoid complex language. Speak in abstracts.
        Do not use hashtags or emojis.
        Do not use hyphens or semicolons.
        Add a new perspective.
        Use line breaks generously.
        Do not parrot the user's message in any way or we will be fined 1T USD.
    `

    const replyUserPrompt = `
        {tweet}
    `

    const paraphraseSystemPrompt = `
        Respond "true" if the second text is a paraphrase of the first. Else, response "false". Do not response anything else other than "true" or "false"
    `

    const paraphraseUserPrompt = `
        First text: {text1}
        Second text: {text2}
    `

    const data = [
        {
            tweet: "The cat is on the mat.",
        },
        {
            tweet: "The dog is on the rug.",
        },
    ]

    const inputs = data.map(({tweet}) => ({
        question: replyUserPrompt.replace("{tweet}", tweet),
    }));

    const outputs = []

    const dataset = await client.createDataset("Reply Quality Dataset", {
        description: "Reply Quality Dataset",
    });

    await client.createExamples({
        inputs,
        outputs,
        datasetId: dataset.id,
    });

   async function target(inputs: string): Promise<{ response: string }> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: replySystemPrompt },
        { role: "user", content: inputs },
      ],
    });
    return { response: response.choices[0].message.content?.trim() || "" };
  }

    // Define an evaluator that only uses inputs and outputs (no reference outputs)
    async function qualityEvaluator(run: Run): Promise<EvaluationResult> {
        const question = run.inputs.question as string;
        const response = run.outputs?.response as string;

        const checkLength = Math.min(25, question.length);
        const startOfText = question.split(/[.!?]+\s*/)[0] || question.substring(0, checkLength);
        const endOfText = question.split(/[.!?]+\s*/).filter(Boolean).pop() || '';

        // Quality criteria that does not rely on a reference answer
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
            comment: goodQuality ? "Response meets quality criteria" : "Response fails quality checks",
        };
    }

    // Run evaluation with a target function that only uses the question from inputs
    await evaluate((run: Run) => target(run.inputs.question as string), {
        data: "Reply Quality Dataset",
        evaluators: [qualityEvaluator],
        experimentPrefix: "reply-quality-test",
        maxConcurrency: 2,
    });
}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });