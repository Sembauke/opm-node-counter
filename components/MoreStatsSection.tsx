import { Box, Text } from "@chakra-ui/react";
import styles from "../app/page.module.css";
import React from "react";
import CountUp from "react-countup";

interface MoreStatsSectionProps {
  averageChangesHour: number;
  largestChangesetHour: number;
  uniqueMappersHour: number;
  newNodesHour: number;
}

const MoreStatsSection: React.FC<MoreStatsSectionProps> = ({ averageChangesHour, largestChangesetHour, uniqueMappersHour, newNodesHour }) => (
  <div style={{ width: '100%' }}>
    <Text fontSize="md" color="#b3eaff" fontWeight={500} mb={2} textAlign="center" opacity={0.85}>
      <span role="img" aria-label="clock" style={{marginRight: 4}}>⏰</span>
      Stats (this hour)
    </Text>
    <div className={styles["stats-section"]} style={{ marginBottom: 0 }}>
      <Box className={styles["glass-card"]}>
        <Text fontSize="2xl" color="#b3eaff" fontWeight={700} mb={2}>
          <span role="img" aria-label="average" style={{marginRight: 6}}>📊</span>
          Avg. Changes per Changeset
        </Text>
        <Text fontSize="2.5rem" color="#eaffb3" fontWeight={800}>
          <CountUp className="counter" preserveValue={true} end={averageChangesHour} />
        </Text>
      </Box>
      <Box className={styles["glass-card"]}>
        <Text fontSize="2xl" color="#b3eaff" fontWeight={700} mb={2}>
          <span role="img" aria-label="largest" style={{marginRight: 6}}>🔝</span>
          Largest Changeset
        </Text>
        <Text fontSize="2.5rem" color="#eaffb3" fontWeight={800}>
          {largestChangesetHour ? (
            <CountUp className="counter" preserveValue={true} end={largestChangesetHour} />
          ) : "-"}
        </Text>
      </Box>
      <Box className={styles["glass-card"]}>
        <Text fontSize="2xl" color="#b3eaff" fontWeight={700} mb={2}>
          <span role="img" aria-label="unique-mappers" style={{marginRight: 6}}>🧑‍🤝‍🧑</span>
          Unique Mappers
        </Text>
        <Text fontSize="2.5rem" color="#eaffb3" fontWeight={800}>
          <CountUp className="counter" preserveValue={true} end={uniqueMappersHour} />
        </Text>
      </Box>
      <Box className={styles["glass-card"]}>
        <Text fontSize="2xl" color="#b3eaff" fontWeight={700} mb={2}>
          <span role="img" aria-label="new-nodes" style={{marginRight: 6}}>🆕</span>
          New Nodes this Hour
        </Text>
        <Text fontSize="2.5rem" color="#eaffb3" fontWeight={800}>
          <CountUp className="counter" preserveValue={true} end={newNodesHour} />
        </Text>
      </Box>
    </div>
  </div>
);

export default MoreStatsSection; 