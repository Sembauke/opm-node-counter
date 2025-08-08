import { Box, Text } from "@chakra-ui/react";
import styles from "../app/page.module.css";
import CountUp from "react-countup";
import React from "react";

interface StatsSectionProps {
  totalNodes: number;
  totalChangesets: number;
  nodesPerMinute: number;
}

const StatsSection: React.FC<StatsSectionProps> = ({ totalNodes, totalChangesets, nodesPerMinute }) => (
  <div className={styles["stats-section"]}>
    <Box className={styles["glass-card"]}>
      <Text fontSize="2xl" color="#b3eaff" fontWeight={700} mb={2}>
        <span role="img" aria-label="nodes" style={{marginRight: 6}}>🧭</span>
        Total Nodes Distributed
      </Text>
      <Text fontSize="2.5rem" color="#eaffb3" fontWeight={800}>
        <CountUp className="counter" preserveValue={true} end={totalNodes} scrollSpyOnce />
      </Text>
    </Box>
    <Box className={styles["glass-card"]}>
      <Text fontSize="2xl" color="#b3eaff" fontWeight={700} mb={2}>
        <span role="img" aria-label="changesets" style={{marginRight: 6}}>🌍</span>
        Total Changesets
      </Text>
      <Text fontSize="2.5rem" color="#eaffb3" fontWeight={800}>
        <CountUp className="counter" preserveValue={true} end={totalChangesets} />
      </Text>
    </Box>
    <Box className={styles["glass-card"]}>
      <Text fontSize="2xl" color="#b3eaff" fontWeight={700} mb={2}>
        <span role="img" aria-label="speed" style={{marginRight: 6}}>⚡</span>
        Nodes per Minute
      </Text>
      <Text fontSize="2.5rem" color="#eaffb3" fontWeight={800}>{nodesPerMinute}</Text>
    </Box>
  </div>
);

export default StatsSection; 