// Explicit operator check. --generate sends only the original fixture below.
const path = require('node:path');
process.loadEnvFile(path.resolve(__dirname, '../.env'));
(async () => {
  const model = process.env.AI_MODEL || 'gemini-2.5-flash-lite',
    key = process.env.AI_API_KEY;
  if (
    process.env.AI_PROVIDER !== 'gemini' ||
    !key ||
    !/^gemini-[a-zA-Z0-9.-]+$/.test(model)
  )
    throw Error(
      'Configure AI_PROVIDER, AI_MODEL and AI_API_KEY in backend/.env',
    );
  const base =
    'https://generativelanguage.googleapis.com/v1beta/models/' + model;
  const metadata = await fetch(base, {
    headers: { 'x-goog-api-key': key },
    signal: AbortSignal.timeout(15000),
  });
  console.log('Gemini model access:', metadata.status, 'model:', model);
  if (!metadata.ok) {
    process.exitCode = 1;
    return;
  }
  const info = await metadata.json();
  console.log(
    'generateContent supported:',
    info.supportedGenerationMethods?.includes('generateContent') === true,
  );
  if (process.argv.includes('--generate')) {
    const response = await fetch(base + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Explain this original test lesson in one English sentence: An array stores items in order. The first index is zero.',
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 100, temperature: 0.2 },
      }),
    });
    const body = await response.json();
    const text = body.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text || '')
      .join('');
    console.log(
      'Original-fixture generation:',
      response.status,
      'nonempty text:',
      !!text?.trim(),
    );
    if (!response.ok || !text?.trim()) process.exitCode = 1;
  }
})().catch((error) => {
  console.error('Provider check failed:', error.name);
  process.exitCode = 1;
});
