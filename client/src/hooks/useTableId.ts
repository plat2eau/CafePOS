import { useParams } from 'react-router-dom'

export function useTableId(): number | null {
  const params = useParams();
  const raw = params.tableId;
  const n = Number(raw);
  if (!raw) return null;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
