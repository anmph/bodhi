import { notFound } from "next/navigation";
import ScriptureReaderClient from "@/components/ScriptureReaderClient";
import { CURATED_SCRIPTURES, SCRIPTURE_MAP } from "@/lib/scriptures";

interface Props {
  params: { id: string };
}

export default function ScriptureReaderPage({ params }: Props) {
  const { id } = params;
  const scripture = SCRIPTURE_MAP.get(id);
  if (!scripture) notFound();

  return <ScriptureReaderClient scripture={scripture} />;
}

export async function generateStaticParams() {
  return CURATED_SCRIPTURES.map((s) => ({ id: s.id }));
}
