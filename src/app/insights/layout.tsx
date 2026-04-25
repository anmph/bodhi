import NavBar from "@/components/NavBar";
import InsightsSubNav from "@/components/InsightsSubNav";

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 max-w-[960px] mx-auto px-4 sm:px-8 pt-8 sm:pt-[52px] pb-12 min-h-screen">
      <NavBar />
      <header className="mb-2">
        <h1 className="font-display text-[2rem] mb-3" style={{ color: "#C8A96E" }}>
          Insights
        </h1>
        <InsightsSubNav />
      </header>
      {children}
    </div>
  );
}
