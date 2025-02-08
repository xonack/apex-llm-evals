import { Client } from "langsmith";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { EvaluationResult } from "langsmith/evaluation";
import { evaluate } from "langsmith/evaluation";

import dotenv from "dotenv";
dotenv.config();

const client = new Client();
const openai = new OpenAI();

async function main() {

    const paraphraseSystemPrompt = `
        Respond "true" if the second text is a paraphrase of the first. Else, response "false". Do not response anything else other than "true" or "false"
    `

    const paraphraseUserPrompt = `
        First text: {text1}
        Second text: {text2}
    `

    const data = [
        {
            text1: "The cat is on the mat.",
            text2: "The feline is on the rug.",
            answer: "true",
        },
        {
            text1: "The cat is on the mat.",
            text2: "The dog is on the rug.",
            answer: "false",
        },
    ]

    const inputs = data.map(({text1, text2}) => ({
        question: paraphraseUserPrompt.replace("{text1}", text1).replace("{text2}", text2),
    }));

    const outputs = data.map(({answer}) => ({
        answer: answer,
    }));

    // const dataset = await client.createDataset("Paraphrase dataset", {
    //     description: "Paraphrase test dataset",
    // });

    // await client.createExamples({
    //     inputs,
    //     outputs,
    //     datasetId: dataset.id,
    // });

   async function target(inputs: string): Promise<{ response: string }> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: paraphraseSystemPrompt },
        { role: "user", content: inputs },
      ],
    });
    return { response: response.choices[0].message.content?.trim() || "" };
  }

    async function accuracy({
        outputs,
        referenceOutputs,
    }: {
        outputs?: Record<string, string>;
        referenceOutputs?: Record<string, string>;
    }): Promise<EvaluationResult> {
        return {
            key: "accuracy",
            score: outputs?.answer === referenceOutputs?.response ? 1 : 0,
        };
    }

    await evaluate(exampleInput => {
        return target(exampleInput.question);
    }, {
        data: "Paraphrase dataset",
        evaluators: [accuracy],
        experimentPrefix: "paraphrase-test",
        maxConcurrency: 2,
    });
}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });