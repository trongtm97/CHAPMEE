import { Card } from "@/components/ui";

const checklist = [
  "Hook trong 3 dòng đầu",
  "Một biến cố chính",
  "Một cảm xúc rõ",
  "Cuối chap có cliffhanger"
] as const;

export function EpisodeWritingChecklist() {
  return (
    <Card className="space-y-3">
      <p className="text-sm font-bold text-white">Writing checklist</p>
      <ul className="space-y-2 text-sm leading-6 text-zinc-300">
        {checklist.map((item) => (
          <li className="flex items-start gap-3" key={item}>
            <span className="mt-1 inline-flex size-2 rounded-full bg-sky-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
