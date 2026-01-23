require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Versión pública y estable para todas las cuentas
      messages: [
        { role: 'system', content: 'Eres un asistente muy útil.' },
        { role: 'user', content: '¿Cuál es la capital de Colombia?' }
      ],
      max_tokens: 100,
    });

    console.log('\n✅ Respuesta del modelo:\n', response.choices[0].message.content);
  } catch (error) {
    console.error('\n❌ Error al llamar a la API de OpenAI:\n', error);
  }
}

main();
