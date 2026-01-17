import { StoreContent } from '@/components/store/StoreContent';
import { getConfig } from '@/lib/db';

// Server Component - fetches config on the server, passes to client
export default async function Store({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === 'preview' ? 'preview' : 'live';

  let config;
  try {
    config = await getConfig(mode);
  } catch {
    // Fallback to live if preview doesn't exist
    config = await getConfig('live');
  }

  return <StoreContent config={config} />;
}
