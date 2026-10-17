import { SAMPLE_EDITION } from "../constants";

export function SampleFrontPage({ name }: { name: string }) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <div className="@container h-full w-full">
      <div className="flex h-full flex-col bg-paper p-[5cqw] text-ink">
        <div className="flex justify-between border-y border-ink py-[0.8cqw] font-condensed text-[1.9cqw] uppercase tracking-[0.2em]">
          <span>Personal edition for {name.trim() || "you"}</span>
          <span>{today}</span>
        </div>
        <p className="mt-[3cqw] text-center font-blackletter text-[10cqw] leading-none">The Morning Paper</p>
        <p className="mt-[1.5cqw] text-center font-display text-[2.4cqw] italic">“{SAMPLE_EDITION.tagline}”</p>
        <div className="mt-[3cqw] border-t-4 border-double border-ink" />
        <span className="mt-[3cqw] self-start bg-ink px-[1.4cqw] py-[0.4cqw] font-condensed text-[1.9cqw] uppercase tracking-[0.2em] text-paper">
          {SAMPLE_EDITION.leadTopic} · Sample edition
        </span>
        <h2 className="mt-[2cqw] font-display text-[6cqw] font-black leading-[1.08]">{SAMPLE_EDITION.leadHeadline}</h2>
        <p className="mt-[1.5cqw] font-display text-[3cqw] italic text-ink/75">{SAMPLE_EDITION.leadDek}</p>
        <div className="mt-auto grid grid-cols-3 gap-[3cqw] border-t border-ink pt-[2.5cqw]">
          {SAMPLE_EDITION.sections.map((s) => (
            <div key={s.name}>
              <p className="font-condensed text-[1.8cqw] uppercase tracking-[0.2em]">{s.name}</p>
              <p className="mt-[1cqw] font-serif text-[2.4cqw] leading-snug">{s.headline}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}