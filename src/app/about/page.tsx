import Link from "next/link";
import NavBar from "@/components/NavBar";
import RedditInsightsSections from "@/components/RedditInsightsSections";

export default function AboutPage() {
  return (
    <div className="relative z-10 max-w-[960px] mx-auto px-4 sm:px-8 pt-8 sm:pt-[52px] pb-12 min-h-screen">
      <NavBar />

      <section
        className="rounded-[14px] px-6 py-7 mb-8"
        style={{ backgroundColor: "#242424", border: "1px solid #333333" }}
      >
        <h1 className="font-display text-[2rem] mb-3" style={{ color: "#C8A96E" }}>
          About Bodhi
        </h1>
        <p className="text-[0.98rem] leading-[1.85]" style={{ color: "#D4CFC7" }}>
          Bodhi is a gentle, AI-assisted companion for Buddhist practice — designed for real questions people ask
          online and in daily life. Below is the same Reddit community analysis that grounded the product; after that,
          we connect those findings to what you can do here in the app.
        </p>
      </section>

      <RedditInsightsSections />

      <section
        className="rounded-[14px] px-6 py-7 mb-6"
        style={{ backgroundColor: "#242424", border: "1px solid #333333" }}
      >
        <h2 className="font-display text-[1.65rem] mb-3" style={{ color: "#C8A96E" }}>
          Why Bodhi
        </h2>
        <p className="text-[0.95rem] leading-[1.85] mb-4" style={{ color: "#D4CFC7" }}>
          The patterns above are not abstract statistics — they describe how people actually seek help: beginners
          looking for a foothold, practitioners wrestling with consistency, and many voices asking for trustworthy
          resources and emotional safety. Bodhi exists to meet those needs in one place: grounded teaching, practical
          tools, and a calm space to return to.
        </p>
        <p className="text-[0.95rem] leading-[1.85]" style={{ color: "#D4CFC7" }}>
          The design choices in{" "}
          <span style={{ color: "#E8D5A8", fontWeight: 600 }}>How This Shaped Bodhi</span> (scripture-aware answers,
          optional web search for real-world recommendations, learning-path style guidance, and a compassionate tone)
          follow directly from that research — so the app and the insights stay connected.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          What you can do here
        </h2>
        <p className="text-[0.9rem] mb-5" style={{ color: "#8F8A81" }}>
          Three pillars bring the idea of Bodhi into everyday use.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <article
            className="rounded-[14px] p-5 flex flex-col"
            style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
          >
            <h3 className="font-display text-[1.15rem] mb-2" style={{ color: "#E8D5A8" }}>
              Personalized AI chat
            </h3>
            <p className="text-[0.86rem] leading-[1.75] flex-1 mb-4" style={{ color: "#C9C3B9" }}>
              Converse with Bodhi using teachings across traditions, optional scripture retrieval, and modes inspired
              by different voices on the path — tuned so beginners feel welcome and curious minds feel heard.
            </p>
            <Link
              href="/chat"
              className="inline-block text-center rounded-[10px] px-3 py-2 text-[0.78rem] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: "rgba(200, 169, 110, 0.18)",
                border: "1px solid rgba(200, 169, 110, 0.4)",
                color: "#E8D5A8",
              }}
            >
              Open Chat
            </Link>
          </article>

          <article
            className="rounded-[14px] p-5 flex flex-col"
            style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
          >
            <h3 className="font-display text-[1.15rem] mb-2" style={{ color: "#E8D5A8" }}>
              Practice
            </h3>
            <p className="text-[0.86rem] leading-[1.75] flex-1 mb-4" style={{ color: "#C9C3B9" }}>
              Read scriptures from the in-app library, complete guided prayers, and build a steady rhythm of study and
              devotion. Guided <strong style={{ color: "#F0EDE6" }}>meditation flows in the app</strong> are planned
              next so sitting practice can live beside reading and prayer.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/scriptures"
                className="inline-block text-center rounded-[10px] px-3 py-2 text-[0.76rem] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.12)",
                  border: "1px solid rgba(200, 169, 110, 0.35)",
                  color: "#E8D5A8",
                }}
              >
                Scriptures
              </Link>
              <Link
                href="/prayers"
                className="inline-block text-center rounded-[10px] px-3 py-2 text-[0.76rem] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.12)",
                  border: "1px solid rgba(200, 169, 110, 0.35)",
                  color: "#E8D5A8",
                }}
              >
                Prayers
              </Link>
            </div>
          </article>

          <article
            className="rounded-[14px] p-5 flex flex-col"
            style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
          >
            <h3 className="font-display text-[1.15rem] mb-2" style={{ color: "#E8D5A8" }}>
              Tracker &amp; insights
            </h3>
            <p className="text-[0.86rem] leading-[1.75] flex-1 mb-4" style={{ color: "#C9C3B9" }}>
              <strong style={{ color: "#F0EDE6" }}>My Practice</strong> shows streaks, reading and prayer history,
              and a snapshot of your journey. <strong style={{ color: "#F0EDE6" }}>Insights</strong> adds community
              signals from Bodhi&apos;s own chats plus the Reddit research — so you can see both the wider sangha and
              your own patterns.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="inline-block text-center rounded-[10px] px-3 py-2 text-[0.76rem] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.12)",
                  border: "1px solid rgba(200, 169, 110, 0.35)",
                  color: "#E8D5A8",
                }}
              >
                My Practice
              </Link>
              <Link
                href="/insights"
                className="inline-block text-center rounded-[10px] px-3 py-2 text-[0.76rem] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.12)",
                  border: "1px solid rgba(200, 169, 110, 0.35)",
                  color: "#E8D5A8",
                }}
              >
                Insights
              </Link>
            </div>
          </article>
        </div>
      </section>

      <p className="text-center text-[0.82rem]" style={{ color: "#6E6A62" }}>
        Ready to begin? Start from the{" "}
        <Link href="/" className="underline" style={{ color: "#C8A96E" }}>
          home
        </Link>{" "}
        or jump into{" "}
        <Link href="/chat" className="underline" style={{ color: "#C8A96E" }}>
          chat
        </Link>
        .
      </p>
    </div>
  );
}
