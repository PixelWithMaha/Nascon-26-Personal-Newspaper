import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE, type LearnedProfile } from "@/features/interests/schemas";
import type { Preferences } from "@/features/onboarding/schemas";
import { applyLearnedChoice, applySignal, buildProfile, feedbackEffect, topicTrend } from "./learning";

const topics = [
  { name: "AI", weight: 0.7 },
  { name: "Cricket", weight: 0.98 },
  { name: "Gaming", weight: 0.08 },
];

describe("applySignal", () => {
  it("raises a topic on like and clamps to range", () => {
    expect(applySignal(topics, "AI", "like").weight).toBe(0.8);
    expect(applySignal(topics, "Cricket", "like").weight).toBe(1);
    expect(applySignal(topics, "gaming", "less_like_this").weight).toBe(0.05);
  });

  it("ignores topics the reader doesn't follow", () => {
    expect(applySignal(topics, "Fashion", "like").weight).toBeNull();
  });
});

describe("feedbackEffect and topicTrend", () => {
  it("describes direction in words", () => {
    const effect = feedbackEffect([
      { topic: "AI", signal: "like" },
      { topic: "ai", signal: "click" },
      { topic: "Gaming", signal: "less_like_this" },
    ]);
    expect(effect).toEqual({ ai: 0.15, gaming: -0.15 });
    expect(topicTrend(effect)).toEqual({ ai: "rising", gaming: "cooling" });
  });
});

const signals = [
  { createdAt: "2026-10-17T08:00:00Z", signal: "like" as const, topic: "Cars", headline: "BMW i3 reaches 754 miles" },
  { createdAt: "2026-10-17T07:00:00Z", signal: "skip" as const, topic: "Cars", headline: "Track testing the BMW M4" },
];

const item = (label: string, refs: string[]) => ({
  label,
  keyword: label.split(" ")[0],
  reason: "Because.",
  evidence_refs: refs,
});

describe("buildProfile", () => {
  it("takes evidence only from real signals and drops items without it", () => {
    const profile = buildProfile(
      { likes: [item("EV range news", ["r1"]), item("Made up theme", ["r99"])], dislikes: [], exploring: [] },
      signals,
      EMPTY_PROFILE,
    );
    expect(profile.likes.map((i) => i.label)).toEqual(["EV range news"]);
    expect(profile.likes[0].evidence).toEqual(["BMW i3 reaches 754 miles"]);
    expect(profile.likes[0].isNew).toBe(true);
  });

  it("never brings back dismissed themes and keeps pinned ones", () => {
    const previous: LearnedProfile = {
      ...EMPTY_PROFILE,
      dismissed: ["BMW motorsport"],
      likes: [
        { id: "ev", label: "EV range news", keyword: "EV range", reason: "", evidence: [], confirmed: true, isNew: false },
      ],
    };
    const profile = buildProfile(
      { likes: [item("EV range news", ["r1"])], dislikes: [item("BMW motorsport", ["r2"])], exploring: [] },
      signals,
      previous,
    );
    expect(profile.likes).toHaveLength(1);
    expect(profile.likes[0].confirmed).toBe(true);
    expect(profile.dislikes).toHaveLength(0);
  });
});

describe("applyLearnedChoice", () => {
  const prefs: Preferences = {
    displayName: "Maha",
    topics,
    keywords: [],
    blockedKeywords: [],
    sources: [],
    readingMinutes: 10,
    timezone: "Asia/Karachi",
  };
  const learned = (id: string, label: string, keyword: string) => ({
    id,
    label,
    keyword,
    reason: "",
    evidence: ["x"],
    confirmed: false,
    isNew: true,
  });
  const profile: LearnedProfile = {
    ...EMPTY_PROFILE,
    likes: [learned("ev", "EV range news", "EV range")],
    dislikes: [learned("motorsport", "BMW motorsport", "BMW motorsport")],
  };

  it("follow adds the keyword and pins the theme", () => {
    const r = applyLearnedChoice(prefs, profile, { itemId: "ev", action: "follow" });
    expect(r.preferences.keywords).toEqual(["EV range"]);
    expect(r.learnedProfile.likes[0].confirmed).toBe(true);
  });

  it("block adds a blocked keyword", () => {
    const r = applyLearnedChoice(prefs, profile, { itemId: "motorsport", action: "block" });
    expect(r.preferences.blockedKeywords).toEqual(["BMW motorsport"]);
  });

  it("dismiss removes the theme and remembers it", () => {
    const r = applyLearnedChoice(prefs, profile, { itemId: "ev", action: "dismiss" });
    expect(r.learnedProfile.likes).toHaveLength(0);
    expect(r.learnedProfile.dismissed).toContain("EV range news");
  });
});