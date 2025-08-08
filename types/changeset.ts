export type Changeset = {
  min_lat: number;
  min_lon: number;
  max_lat: number;
  max_lon: number;
  changes_count: number;
  created_at?: string,
  timestamp?: string,
  id: number;
  tags: {
    comment: string;
  };
  user: string;
}; 