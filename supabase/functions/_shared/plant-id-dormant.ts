/**
 * Intégration Plant.id conservée pour une réactivation future.
 * Elle n'est importée par aucune Edge Function active et ne consomme donc aucun crédit.
 */
export async function identifyWithPlantId(imageBase64: string, apiKey: string) {
  const response = await fetch("https://plant.id/api/v3/identification", {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ images: [imageBase64], similar_images: true }),
  });
  if (!response.ok) throw new Error(`Plant.id identification failed (${response.status})`);
  return response.json();
}

export async function assessHealthWithPlantId(imageBase64: string, apiKey: string) {
  const response = await fetch("https://plant.id/api/v3/health_assessment", {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ images: [imageBase64], disease_details: ["description", "treatment"] }),
  });
  if (!response.ok) throw new Error(`Plant.id health assessment failed (${response.status})`);
  return response.json();
}
