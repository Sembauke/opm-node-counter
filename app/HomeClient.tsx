"use client";
import { useState, useRef, useEffect } from "react";
import { Flex, Text, Box, Image, Button, Spinner } from "@chakra-ui/react";
import styles from "./page.module.css";
import { FaGlobe } from "react-icons/fa";
import CountUp from "react-countup";
import useSound from "use-sound";
import { io } from "socket.io-client";
import PodiumWidget from "../components/PodiumWidget";
import StatsSection from "../components/StatsSection";
import MoreStatsSection from "../components/MoreStatsSection";
import ChangesetListWidget from "../components/ChangesetListWidget";
import { Changeset } from "@/types/changeset";


interface HomeClientProps {
  changesetBatch: Changeset[];
  totalNodes: number;
  totalChangesets: number;
  uniqueMappersHour: number;
  topMappersHour: { user: string; count: number }[];
  averageChangesHour: number;
  largestChangesetHour: number;
  nodesPerMinute: number;
  newNodesHour: number;
}

export type { HomeClientProps };
export default function HomeClient({
  changesetBatch: initialChangesetBatch,
  totalNodes: initialTotalNodes,
  totalChangesets: initialTotalChangesets,
  uniqueMappersHour: initialUniqueMappersHour,
  topMappersHour: initialTopMappersHour,
  averageChangesHour: initialAverageChangesHour,
  largestChangesetHour: initialLargestChangesetHour,
  nodesPerMinute: initialNodesPerMinute,
  newNodesHour: newNodesHour,
}: HomeClientProps) {
  const [newChangesetIds, setNewChangesetIds] = useState<number[]>([]);
  const prevBatchRef = useRef<Changeset[]>([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);


  const [liveData, setLiveData] = useState({
    changesetBatch: initialChangesetBatch,
    totalNodes: initialTotalNodes,
    totalChangesets: initialTotalChangesets,
    uniqueMappersHour: initialUniqueMappersHour,
    topMappersHour: initialTopMappersHour,
    averageChangesHour: initialAverageChangesHour,
    largestChangesetHour: initialLargestChangesetHour,
    nodesPerMinute: initialNodesPerMinute,
    newNodesHour: newNodesHour,
  });

  useEffect(() => {
    setLiveData({
      changesetBatch: initialChangesetBatch,
      totalNodes: initialTotalNodes,
      totalChangesets: initialTotalChangesets,
      uniqueMappersHour: initialUniqueMappersHour,
      topMappersHour: initialTopMappersHour,
      averageChangesHour: initialAverageChangesHour,
      largestChangesetHour: initialLargestChangesetHour,
      nodesPerMinute: initialNodesPerMinute,
      newNodesHour: newNodesHour,
    });
    const socket = io({ path: "/api/socket/io" });


    socket.on("stats", (data) => {
      setLiveData(prev => ({ ...prev, ...data }));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const prevIds = new Set(prevBatchRef.current.map(cs => cs.id));
    const newIds = liveData.changesetBatch.filter(cs => !prevIds.has(cs.id)).map(cs => cs.id);
    setNewChangesetIds(newIds);
    prevBatchRef.current = liveData.changesetBatch;
    if (newIds.length > 0) {
      setTimeout(() => setNewChangesetIds([]), 1500);
    }
  }, [liveData.changesetBatch]);

  const handleReset = async () => {
    setResetLoading(true);
    setResetSuccess(false);
    setResetError(null);
    try {
      const res = await fetch("/api/reset-stats", { method: "POST" });
      if (res.ok) {
        setResetSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setResetError(data.error || "Failed to reset stats");
      }
    } catch (err: any) {
      setResetError(err?.message || "Failed to reset stats");
    } finally {
      setResetLoading(false);
      setTimeout(() => setResetSuccess(false), 2000);
    }
  };

  return (
    <div className={styles["amazing-layout"]}>

      <Box position="absolute" top={0} left={0} w="100%" h="100%" zIndex={0} opacity={0.08} pointerEvents="none">
        <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: '100%', height: '100%' }}>
          <path d="M100 300 Q200 100 400 200 T700 300 Q600 500 400 400 T100 300 Z" fill="#00eaff" />
          <circle cx="400" cy="300" r="180" fill="#eaffb3" opacity="0.2" />
        </svg>
      </Box>
      <div className={styles["main-container"]}>
        <Box mb={4} display="flex" justifyContent="flex-end" alignItems="center" width="100%">
          <Button
            colorScheme="cyan"
            variant="outline"
            onClick={handleReset}
            loading={resetLoading}
            loadingText="Resetting..."
            size="sm"
            borderRadius="md"
            borderWidth={2}
            borderColor="#00eaff"
            color="#00eaff"
            _hover={{ bg: "#00eaff22" }}
          >
            Reset All Stats
          </Button>
        </Box>
        {resetSuccess && (
          <Box bg="green.500" color="white" p={3} borderRadius="md" mb={4}>
            Stats reset successfully.
          </Box>
        )}
        {resetError && (
          <Box bg="red.500" color="white" p={3} borderRadius="md" mb={4}>
            {resetError}
          </Box>
        )}
        <div className={styles.header}>
          <span className={styles["header-icon"]} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(44, 83, 100, 0.25)' }}>
            <FaGlobe size={56} color="#00eaff" style={{ filter: 'drop-shadow(0 0 16px #00eaffcc)' }} />
          </span>
          <div className={styles.title}>
            <span role="img" aria-label="map" style={{ marginRight: 8 }}>🗺️</span>
            OpenStreetMap Node Counter
          </div>
          <div className={styles.subtitle}>
            <span role="img" aria-label="satellite" style={{ marginRight: 6 }}>🛰️</span>
            Live stats from the OSM community
          </div>
        </div>
        <StatsSection
          totalNodes={liveData.totalNodes}
          totalChangesets={liveData.totalChangesets}
          nodesPerMinute={liveData.nodesPerMinute}
        />
        <MoreStatsSection
          averageChangesHour={liveData.averageChangesHour}
          largestChangesetHour={liveData.largestChangesetHour}
          uniqueMappersHour={liveData.uniqueMappersHour}
          newNodesHour={liveData.newNodesHour}
        />
        <Box
          display={{ base: "block", md: "flex" }}
          gap={{ base: 0, md: "2rem" }}
          alignItems="flex-start"
          width="100%"
          justifyContent="center"
          mt={4}
        >
          <PodiumWidget topMappersHour={liveData.topMappersHour} />
          <ChangesetListWidget
            changesetBatch={liveData.changesetBatch}
            newChangesetIds={newChangesetIds}
          />
        </Box>
      </div>
      <footer style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '2.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          background: 'rgba(30, 30, 30, 0.8)',
          borderRadius: '18px',
          boxShadow: '0 4px 16px 0 rgba(0, 234, 255, 0.12)',
          border: '1.5px solid rgba(0, 234, 255, 0.14)',
          padding: '1rem 2.5rem',
          color: '#b3eaff',
          fontSize: '1rem',
          textAlign: 'center',
          opacity: 0.85,
          maxWidth: '600px',
        }}>
          This statistics website is for entertainment only and may not be accurate.
        </div>
      </footer>
    </div>
  );
} 