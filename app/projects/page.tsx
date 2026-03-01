import Link from "next/link";
import { getAllProjectTagChanges } from "@/actions/get-all-project-tag-changes";
import ProjectsGrid from "./ProjectsGrid";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Projects - OpenStreetMap Node Counter",
};

export default async function ProjectsPage() {
  const projects = await getAllProjectTagChanges();

  return (
    <div className={styles.page}>
      <div className={styles.backgroundArt} aria-hidden />

      <main className={styles.container}>
        <div className={styles.pageHeader}>
          <Link href="/" className={styles.backLink}>
            &larr; Back
          </Link>
          <div>
            <h1 className={styles.title}>Total changes per #project tag</h1>
            <p className={styles.subtitle}>
              {projects.length} project tag{projects.length === 1 ? "" : "s"} with recorded activity
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <p className={styles.empty}>No project data recorded yet.</p>
        ) : (
          <ProjectsGrid initialProjects={projects} />
        )}
      </main>
    </div>
  );
}
