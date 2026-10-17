import Link from "next/link";

export default function PaperPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-serif text-4xl font-bold tracking-tight">Your paper is being set.</h1>
      <p className="mt-4 text-muted-foreground">
        Your interests are saved. Your first edition arrives once generation is built.
      </p>
      <Link href="/onboarding" className="mt-8 inline-block underline underline-offset-4">
        Change my interests
      </Link>
    </main>
  );
}