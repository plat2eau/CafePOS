import { useParams } from 'react-router-dom'

export function useTableId(): string | null {
  const params = useParams();
  const raw = params.tableId;
  if (!raw) return null;
  return raw;
}
