import { Box, Text } from "@chakra-ui/react";
import React from "react";
import styles from "../app/page.module.css";

interface PodiumWidgetProps {
  topMappersHour: { user: string; count: number }[];
}

const PodiumWidget: React.FC<PodiumWidgetProps> = ({ topMappersHour }) => (

    <Box
      background="rgba(30, 30, 30, 0.8)"
      borderRadius="28px"
      boxShadow="0 8px 32px 0 rgba(0, 234, 255, 0.18)"
      border="1.5px solid rgba(0, 234, 255, 0.22)"
      padding="2.2rem 2.7rem"
      width="100%"
      maxWidth="700px"
      margin="32px auto"
      display="flex"
      flexDirection="column"
      alignItems="center"
    >
      <Text fontWeight={700} fontSize="xl" color="#b3eaff" mb={2}>
    <span role="img" aria-label="podium" style={{ marginRight: 6 }}>🏅</span>
    Top Mapper Podium by amount of changes (per hour)
  </Text>
      <Box display="flex" justifyContent="center" alignItems="flex-end" gap={6} minWidth="420px" maxWidth="600px" width="100%">
      {/* P2 */}
      <Box flex="1" textAlign="center" style={{ marginTop: '2.5rem' }}>
        <Text fontSize="2xl" color="#c0c0c0">🥈</Text>
        <Text fontWeight={700} color="#c0c0c0" fontSize="lg" wordBreak="break-all">
          {topMappersHour[1]?.user ? (
            <a
              href={`https://www.openstreetmap.org/user/${encodeURIComponent(topMappersHour[1].user)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#c0c0c0', textDecoration: 'underline' }}
            >
              {topMappersHour[1].user}
            </a>
          ) : '-'}
        </Text>
        {topMappersHour[1] && (
          <Text fontSize="md" color="#c0c0c0" fontWeight={500}>
            {topMappersHour[1].count} changes
          </Text>
        )}
        <Box mt={2} height="32px" width="120px" bg="#c0c0c0" borderRadius="0.5rem 0.5rem 0 0" boxShadow="0 2px 8px #0002" mx="auto" />
      </Box>
      {/* P1 */}
      <Box flex="1" textAlign="center" style={{ marginTop: '0rem' }}>
        <Text fontSize="2.7rem" color="#ffe066">🥇</Text>
        <Text fontWeight={900} color="#ffe066" fontSize="2xl" wordBreak="break-all">
          {topMappersHour[0]?.user ? (
            <a
              href={`https://www.openstreetmap.org/user/${encodeURIComponent(topMappersHour[0].user)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ffe066', textDecoration: 'underline' }}
            >
              {topMappersHour[0].user}
            </a>
          ) : '-'}
        </Text>
        {topMappersHour[0] && (
          <Text fontSize="md" color="#ffe066" fontWeight={700}>
            {topMappersHour[0].count} changes
          </Text>
        )}
        <Box mt={2} height="56px" width="160px" bg="#ffe066" borderRadius="0.5rem 0.5rem 0 0" boxShadow="0 2px 12px #0003" mx="auto" />
      </Box>
      {/* P3 */}
      <Box flex="1" textAlign="center" style={{ marginTop: '4rem' }}>
        <Text fontSize="2xl" color="#cd7f32">🥉</Text>
        <Text fontWeight={700} color="#cd7f32" fontSize="lg" wordBreak="break-all">
          {topMappersHour[2]?.user ? (
            <a
              href={`https://www.openstreetmap.org/user/${encodeURIComponent(topMappersHour[2].user)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#cd7f32', textDecoration: 'underline' }}
            >
              {topMappersHour[2].user}
            </a>
          ) : '-'}
        </Text>
        {topMappersHour[2] && (
          <Text fontSize="md" color="#cd7f32" fontWeight={500}>
            {topMappersHour[2].count} changes
          </Text>
        )}
        <Box mt={2} height="20px" width="100px" bg="#cd7f32" borderRadius="0.5rem 0.5rem 0 0" boxShadow="0 2px 6px #0002" mx="auto" />
      </Box>
    </Box>
    <Box mt={6} width="100%" maxWidth="600px" textAlign="left">
      <div style={{ width: '100%', marginTop: 8, padding: '0 8px', boxSizing: 'border-box' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {Array.from({ length: 15 }).map((_, idx) => {
              const realIdx = idx + 3;
              const mapper = topMappersHour[realIdx] || { user: '-', count: 0 };
              return (
                <tr key={mapper.user + realIdx} style={{ background: idx % 2 === 0 ? 'rgba(0,234,255,0.03)' : 'transparent' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 500, color: '#b3eaff', width: 32 }}>{realIdx + 1}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 500, color: '#b3eaff' }}>
                    {mapper.user && mapper.user !== '-' ? (
                      <a
                        href={`https://www.openstreetmap.org/user/${encodeURIComponent(mapper.user)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'underline' }}
                      >
                        {mapper.user}
                      </a>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 400, color: '#fff', width: 60 }}>{mapper.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Box>
    </Box>

);

export default PodiumWidget; 