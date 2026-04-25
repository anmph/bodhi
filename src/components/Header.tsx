export default function Header() {
  return (
    <header className="text-center mb-8 animate-fade-in-down">
      <span className="block text-[40px] mb-2" style={{ opacity: 0.85 }}>
        ☸
      </span>
      <h1
        className="font-display sm:text-[3.4rem] text-[2.4rem] font-bold tracking-[-0.02em] leading-[1.1] mb-2"
        style={{ color: "#F0EDE6" }}
      >
        Bodhi
      </h1>
      <p
        className="font-display text-[1.25rem] italic tracking-[0.01em]"
        style={{ color: "#A8A49C" }}
      >
        Your AI companion for Buddhist practice
      </p>
      <div
        className="mx-auto mt-4 rounded-sm"
        style={{ width: 60, height: 2, backgroundColor: "#C8A96E" }}
      />
    </header>
  );
}
