export async function askAI(question, data) {
  const response = await fetch("http://127.0.0.1:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      data,
    }),
  });

  if (!response.ok) {
    throw new Error("Erreur IA");
  }

  return await response.json();
}