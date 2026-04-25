import summaryStats from "@/data/reddit_summary_stats.json";

type TopicRow = { topic: string; count: number };

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

/**
 * Full Reddit sample analysis (shared by Insights → From Reddit and About Bodhi).
 */
export default function RedditInsightsSections() {
  const topicRows = summaryStats.most_common_topics as TopicRow[];
  const topicTotal = topicRows.reduce((sum, row) => sum + row.count, 0);
  const sentimentRows = Object.entries(summaryStats.sentiment_distribution).map(
    ([label, count]) => ({ label, count: Number(count) })
  );
  const sentimentTotal = sentimentRows.reduce((sum, row) => sum + row.count, 0);

  const beginnerPct = percentage(
    topicRows.find((row) => row.topic === "Beginner Questions")?.count ?? 0,
    topicTotal
  );
  const seekingHelpPct = percentage(
    sentimentRows.find((row) => row.label === "seeking-help")?.count ?? 0,
    sentimentTotal
  );
  const meditationPct = percentage(
    topicRows.find((row) => row.topic === "Meditation Practice")?.count ?? 0,
    topicTotal
  );

  return (
    <>
      <section
        className="rounded-[14px] px-6 py-7 mb-6"
        style={{ backgroundColor: "#242424", border: "1px solid #333333" }}
      >
        <h2 className="font-display text-[2rem] mb-2" style={{ color: "#C8A96E" }}>
          Insights from the Sangha
        </h2>
        <p className="text-[0.98rem] leading-[1.8]" style={{ color: "#D4CFC7" }}>
          We analyzed{" "}
          <span style={{ color: "#F0EDE6", fontWeight: 600 }}>{summaryStats.input_post_count}</span> posts from
          Buddhist communities on Reddit to understand what practitioners need most.
        </p>
      </section>

      <section
        className="rounded-[14px] p-5 mb-5"
        style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
      >
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          Topic Distribution (Reddit sample)
        </h2>
        <div className="space-y-3">
          {topicRows.map((row) => {
            const pct = percentage(row.count, topicTotal);
            return (
              <div key={row.topic}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: "#D4CFC7", fontSize: "0.86rem" }}>{row.topic}</span>
                  <span style={{ color: "#C8A96E", fontSize: "0.8rem", fontWeight: 600 }}>{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full" style={{ backgroundColor: "#1C1C1C" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: "#C8A96E" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="rounded-[14px] p-5 mb-5"
        style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
      >
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          Sentiment Distribution (Reddit sample)
        </h2>
        <div className="space-y-3">
          {sentimentRows.map((row) => {
            const pct = percentage(row.count, sentimentTotal);
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span
                    style={{ color: "#D4CFC7", fontSize: "0.86rem", textTransform: "capitalize" }}
                  >
                    {row.label.replace("-", " ")}
                  </span>
                  <span style={{ color: "#C8A96E", fontSize: "0.8rem", fontWeight: 600 }}>{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full" style={{ backgroundColor: "#1C1C1C" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: "#C8A96E" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="rounded-[14px] p-5 mb-5"
        style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
      >
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          Key Findings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <article className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.14rem] mb-2" style={{ color: "#E8D5A8" }}>
              Beginner support is a major need
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              Beginner questions make up <strong style={{ color: "#F0EDE6" }}>{beginnerPct}%</strong> of sampled
              posts, with many asking where and how to start meditating.
            </p>
          </article>
          <article className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.14rem] mb-2" style={{ color: "#E8D5A8" }}>
              Help-seeking is consistently present
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              <strong style={{ color: "#F0EDE6" }}>{seekingHelpPct}%</strong> of posts carry a seeking-help tone,
              signaling demand for practical and compassionate guided support.
            </p>
          </article>
          <article className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.14rem] mb-2" style={{ color: "#E8D5A8" }}>
              Practice questions are frequent
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              Meditation-practice topics account for{" "}
              <strong style={{ color: "#F0EDE6" }}>{meditationPct}%</strong> of discussions, often focused on
              consistency, obstacles, and day-to-day routine.
            </p>
          </article>
          <article className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.14rem] mb-2" style={{ color: "#E8D5A8" }}>
              Resource discovery remains important
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              Book and resource recommendation requests remain active, especially among newcomers seeking trusted
              starting points.
            </p>
          </article>
        </div>
      </section>

      <section
        className="rounded-[14px] p-5 mb-6"
        style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
      >
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          How This Shaped Bodhi
        </h2>
        <div className="space-y-3">
          <div className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.08rem] mb-1" style={{ color: "#E8D5A8" }}>
              RAG Scripture Retrieval for foundational questions
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              Because beginner questions are common, Bodhi emphasizes grounded answers linked to scripture passages and
              beginner-safe explanations.
            </p>
          </div>
          <div className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.08rem] mb-1" style={{ color: "#E8D5A8" }}>
              Web Search for trusted recommendations
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              Since users ask for books and practical resources, Bodhi can fetch current recommendations rather than
              relying only on static references.
            </p>
          </div>
          <div className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.08rem] mb-1" style={{ color: "#E8D5A8" }}>
              Learning Path guidance for “where do I start?”
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              High novice demand informed a progressive path design: simple first steps, gentle follow-ups, and
              consistency-oriented support.
            </p>
          </div>
          <div className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.08rem] mb-1" style={{ color: "#E8D5A8" }}>
              Compassion-forward response tone
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              The seeking-help signal reinforced the need for emotionally safe guidance, reflected in character modes
              and supportive language throughout chat.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
