import { Box } from "@chakra-ui/react";
import styles from "../app/page.module.css";
import React from "react";
import { Changeset } from "@/types/changeset";


interface ChangesetListWidgetProps {
  changesetBatch: Changeset[];
  newChangesetIds: number[];
}

const ChangesetListWidget: React.FC<ChangesetListWidgetProps> = ({ changesetBatch, newChangesetIds }) => (
  <Box
    background="rgba(30, 30, 30, 0.8)"
    borderRadius="28px"
    boxShadow="0 8px 32px 0 rgba(0, 234, 255, 0.18)"
    border="1.5px solid rgba(0, 234, 255, 0.22)"
    padding="2.2rem 2.7rem"
    width="100%"
    maxWidth="700px"
    margin="32px auto 0 auto"
    display="flex"
    flexDirection="column"
    alignItems="center"
  >
    <div className={styles["changesets-section"]} style={{margin: 0, width: '100%'}}>
      <div className={styles["section-title"]}>
        <span role="img" aria-label="latest" style={{marginRight: 6}}>🛰️</span>
        Latest Changesets
      </div>
      <Box className={styles["changeset-list"]}>
        {changesetBatch.slice(0, 5).map((changeset) => (
          <Box
            key={changeset.id}
            className={
              styles["changeset-card"] +
              (newChangesetIds.includes(changeset.id) ? " " + styles["new-changeset"] : "")
            }
            width="100%"
          >
            <div className={styles["changeset-header"]}>
              <span className={styles["changeset-user"]}>
                <span role="img" aria-label="user" style={{marginRight: 4}}>🧑‍💻</span>
                Created by {changeset.user ? (
                  <a
                    href={`https://www.openstreetmap.org/user/${encodeURIComponent(changeset.user)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#00eaff', textDecoration: 'underline' }}
                  >
                    {changeset.user}
                  </a>
                ) : '-'}
              </span>
            </div>
            <div className={styles["changeset-comment"]}>
              <span role="img" aria-label="comment" style={{marginRight: 4}}>💬</span>
              Comment: {changeset.tags.comment}
            </div>
            <div className={styles["changeset-body"]}>
              <span className={styles["changeset-count"]}>
                <span role="img" aria-label="count" style={{marginRight: 4}}>📍</span>
                {changeset.changes_count} {changeset.changes_count === 1 ? "change" : "changes"}
              </span>
            </div>
          </Box>
        ))}
      </Box>
    </div>
  </Box>
);

export default ChangesetListWidget; 