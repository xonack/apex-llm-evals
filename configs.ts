import dotenv from "dotenv";
dotenv.config();

export const configs = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: "https://api.openai.com/v1",
        models: {
            "4o-sean": "ft:gpt-4o-2024-08-06:personal:4o-sean:AaOoSdYI",
            "4o-taylin": "ft:gpt-4o-2024-08-06:personal:4o-taylin:Af3ZTGkI",
            "4o-jens": "ft:gpt-4o-2024-08-06:personal:reply-4o-0:AClqrMiw",
            "4o": "gpt-4o",
        },
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: "https://api.anthropic.com/v1",
        models: {
            "claude-3-5-sonnet-20240620": "claude-3-5-sonnet-20240620",
        },
    },
    google: {
        apiKey: process.env.GOOGLE_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        models: {
            "gemini-2.0-flash": "gemini-2.0-flash",
            "gemini-2.0-pro": "gemini-2.0-pro",
            "gemini-2.0-flash-lite": "gemini-2.0-flash-lite-preview-02-05"
        },
    },
}