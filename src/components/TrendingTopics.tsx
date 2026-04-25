"use client";

import Link from "next/link";
import summaryStats from "@/data/reddit_summary_stats.json";

type TopicRow = { topic: string; count: number };

const QUESTION_BY_TOPIC: Record<string, string> = {
  "Meditation Practice": "Can you help me start a simple daily meditation routine?",
  "Buddhist Philosophy": "Can you explain core Buddhist concepts in plain language?",
  "Beginner Questions": "I am new to Buddhism. Where should I begin?",
  "Mental Health & Wellbeing": "How can Buddhist practice help with difficult emotions right now?",
  "Book/Resource Recommendations": "Can you recommend reliable beginner books and teachers?",
  "Community & Sangha": "How can I find a supportive Buddhist community or sangha?",
  Other: "What is one good next step for my Buddhist practice today?",
};

export default function TrendingTopics() {
  const topics = (summaryStats.most_common_topics as TopicRow[]).slice(0, 5);

  return (
    <section className="mt-5">
      <h3 className="font-display text-[1.25rem] mb-3" style={{ color: "#E8D5A8" }}>
        What the community is discussing
      </h3>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => {
          const question = QUESTION_BY_TOPIC[topic.topic] ?? QUESTION_BY_TOPIC.Other;
          return (
            <Link
              key={topic.topic}
              href={`/chat?question=${encodeURIComponent(question)}`}
              className="px-3 py-1.5 rounded-full text-[0.76rem] transition-colors"
              style={{
                backgroundColor: "rgba(200, 169, 110, 0.14)",
                border: "1px solid rgba(200, 169, 110, 0.3)",
                color: "#E8D5A8",
              }}
            >
              {topic.topic} ({topic.count})
            </Link>
          );
        })}
      </div>
    </section>
  );
}
