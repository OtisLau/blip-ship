import { StoreContent } from '@/components/store/StoreContent';
import { getConfig } from '@/lib/db';
import { getConfigFromBranch } from '@/lib/git-service';
import type { SiteConfig } from '@/lib/types';

// Server Component - fetches config on the server, passes to client
export default async function Store({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; branch?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode;

  let config: SiteConfig;

  try {
    if (mode === 'branch' && params.branch) {
      // Load config from a specific git branch without checking out
      const configContent = await getConfigFromBranch(params.branch);
      config = JSON.parse(configContent);
    } else if (mode === 'preview') {
      config = await getConfig('preview');
    } else {
      config = await getConfig('live');
    }
  } catch {
    // Fallback to live if branch/preview doesn't exist
    config = await getConfig('live');
  }

  return <StoreContent config={config} />;
}
