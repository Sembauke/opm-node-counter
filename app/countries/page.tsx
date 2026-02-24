import Link from "next/link";
import { getAllCountryChanges } from "@/actions/get-all-country-changes";
import CountriesGrid from "./CountriesGrid";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Countries — OpenStreetMap Node Counter",
};

export default async function CountriesPage() {
  const countries = await getAllCountryChanges();

  return (
    <div className={styles.page}>
      <div className={styles.backgroundArt} aria-hidden />

      <main className={styles.container}>
        <div className={styles.pageHeader}>
          <Link href="/" className={styles.backLink}>
            ← Back
          </Link>
          <div>
            <h1 className={styles.title}>Total changes per country</h1>
            <p className={styles.subtitle}>
              {countries.length} countr{countries.length === 1 ? "y" : "ies"} with recorded activity since tracking began
            </p>
          </div>
        </div>

        {countries.length === 0 ? (
          <p className={styles.empty}>No country data recorded yet.</p>
        ) : (
          <CountriesGrid initialCountries={countries} />
        )}
      </main>
    </div>
  );
}
