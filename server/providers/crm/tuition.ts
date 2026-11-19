// The academy's tuition packages as the fee notice sent to parents states
// them (2026-11): what a package of sessions costs, what the books cost with
// it, and what is given with it. Choosing a package as an opportunity's
// business type fills its amount with the package's total (form.tsx), and
// the form shows the package's terms under the choice.
//
// The CRM records what the parent pays. The books and gifts themselves are
// stock of the bookshop application, which issues them; nothing here counts
// them.
//
// Change a price here, in one place. Kept free of imports so the browser
// bundle can take it, as limits.ts is.

export interface TuitionPackage {
  // The opportunity business type that stands for the package.
  key: string;
  sessions: number;
  // What the sessions cost.
  tuition: number;
  // What the course books cost with this package; 0 when they are waived.
  bookFee: number;
  // The books' value the package waives.
  bookWaiver: number;
  // What the package saves on the per-session price.
  saving: number;
  // What is given with the package, and what it is worth.
  gift?: { key: 'chessSet' | 'chessDomino'; value: number };
}

export const TUITION_CURRENCY = 'VND';
// One session, in minutes.
export const SESSION_MINUTES = 75;

export const tuitionPackages: readonly TuitionPackage[] = [
  {
    key: 'course10',
    sessions: 10,
    tuition: 1_500_000,
    bookFee: 200_000,
    bookWaiver: 0,
    saving: 0,
  },
  {
    key: 'course20',
    sessions: 20,
    tuition: 3_000_000,
    bookFee: 200_000,
    bookWaiver: 0,
    saving: 0,
    gift: { key: 'chessSet', value: 200_000 },
  },
  {
    key: 'course40',
    sessions: 40,
    tuition: 5_500_000,
    bookFee: 0,
    bookWaiver: 300_000,
    saving: 500_000,
    gift: { key: 'chessDomino', value: 100_000 },
  },
];

export function tuitionPackage(key: unknown): TuitionPackage | undefined {
  return tuitionPackages.find((item) => item.key === key);
}

// What the parent pays for a package: its sessions and its books.
export function tuitionTotal(item: TuitionPackage): number {
  return item.tuition + item.bookFee;
}
