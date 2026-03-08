// helpers/generateStory.ts
// Клієнтська функція для виклику /api/openai з токеном авторизації

import { getAuth } from "firebase/auth";

interface CustomValues {
  team?: string;
  heroes?: string;
  events?: string;
}

interface StoryResult {
  title: string;
  paragraphs: Array<{ paragraph: string }>;
  imageUrl: string;
  creditsRemaining: number;
}

export async function generateStory(
  region: string,
  customValueForStory?: CustomValues,
): Promise<StoryResult> {
  // Отримати актуальний Firebase ID Token
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User is not authenticated");
  }

  // forceRefresh: false — використовує кешований токен якщо він ще дійсний
  const token = await currentUser.getIdToken(false);

  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // !! Ось як передаємо токен — в Authorization header
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ region, customValueForStory }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Недостатньо кредитів — особлива обробка
    if (response.status === 402) {
      throw new Error(data.message || "insufficient_credits");
    }
    throw new Error(data.error || "Story generation failed");
  }

  return data;
}
