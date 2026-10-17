import "server-only";
import type { InterestsData, LearnedAction } from "@/features/interests/schemas";
import { HttpError } from "@/server/http";
import { getLearnedProfile, getPreferences, saveLearnedProfile, savePreferences } from "./preferences";
import {
  applyLearnedChoice,
  feedbackEffect,
  isProfileStale,
  loadSignals,
  refreshLearnedProfile,
  topicTrend,
} from "./learning";

export async function getInterestsData(userId: string): Promise<InterestsData | null> {
  const [preferences, storedProfile, signals] = await Promise.all([
    getPreferences(userId),
    getLearnedProfile(userId),
    loadSignals(userId, { sinceDays: 30 }),
  ]);
  if (!preferences) return null;

  let learnedProfile = storedProfile;
  if (isProfileStale(storedProfile, signals[0]?.createdAt)) {
    learnedProfile = await refreshLearnedProfile(userId).catch((err) => {
      console.warn("[interests] profile refresh failed", err);
      return storedProfile;
    });
  }

  return {
    preferences,
    learnedProfile,
    recentSignals: signals.slice(0, 10),
    topicTrend: topicTrend(feedbackEffect(signals)),
  };
}

export async function applyLearnedAction(userId: string, input: LearnedAction) {
  const [prefs, profile] = await Promise.all([getPreferences(userId), getLearnedProfile(userId)]);
  if (!prefs) throw new HttpError(409, "Finish onboarding first");

  const result = applyLearnedChoice(prefs, profile, input);
  if (result.preferences !== prefs) await savePreferences(userId, result.preferences);
  await saveLearnedProfile(userId, result.learnedProfile);
  return result;
}