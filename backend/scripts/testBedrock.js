require('dotenv').config();
const AWS = require('aws-sdk');

const bedrock = new AWS.BedrockRuntime({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const userMessage = 'mala maglya varshi cha income tas pajije';

const prompt = `You are a document assistant for a CA (Chartered Accountant) firm.

A client sent this message: "${userMessage}"

Extract document request info from this message.

Available document types: ITR, GST, TDS, AUDIT, BALANCE SHEET
Year format examples: 2024-25, 2025-26, 2023-24

Respond in EXACTLY this JSON format (no extra text):
{
  "isDocumentRequest": true,
  "documentType": "ITR",
  "year": "2024-25",
  "reply": null
}

Rules:
- If asking for a document: isDocumentRequest true, fill documentType and year
- "maglya varshi" means "last year" in Marathi → map to previous financial year 2024-25
- "income tax" / "income tas" = ITR
- If irrelevant: isDocumentRequest false, reply in same language as user`;

async function test() {
    try {
        console.log('🤖 Sending to Bedrock...');
        console.log('Message:', userMessage);
        console.log('Region:', process.env.AWS_REGION);
        console.log('Key:', process.env.AWS_ACCESS_KEY_ID?.slice(0, 8) + '...');

        const body = JSON.stringify({
            messages: [{ role: 'user', content: [{ text: prompt }] }],
            inferenceConfig: { maxTokens: 300, temperature: 0.1 }
        });

        const result = await bedrock.invokeModel({
            modelId: 'amazon.nova-micro-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body
        }).promise();

        const responseBody = JSON.parse(Buffer.from(result.body).toString());
        const aiText = responseBody.output.message.content[0].text.trim();
        console.log('\n✅ AI Response:', aiText);

        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('\n📋 Parsed:', parsed);
        }

    } catch (err) {
        console.error('\n❌ ERROR:', err.code);
        console.error('Message:', err.message);
    }
}

test();
