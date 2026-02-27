import Link from "next/link";
import { getAllMapperChanges } from "@/actions/get-all-mapper-changes";
import UsersGrid from "./UsersGrid";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Users - OpenStreetMap Node Counter",
};

export default async function UsersPage() {
  const users = await getAllMapperChanges();

  return (
    <div className={styles.page}>
      <div className={styles.backgroundArt} aria-hidden />

      <main className={styles.container}>
        <div className={styles.pageHeader}>
          <Link href="/" className={styles.backLink}>
            &larr; Back
          </Link>
          <div>
            <h1 className={styles.title}>Total changes per user</h1>
            <p className={styles.subtitle}>
              {users.length} user{users.length === 1 ? "" : "s"} with recorded activity since tracking began
            </p>
          </div>
        </div>

        {users.length === 0 ? (
          <p className={styles.empty}>No user data recorded yet.</p>
        ) : (
          <UsersGrid initialUsers={users} />
        )}
      </main>
    </div>
  );
}
