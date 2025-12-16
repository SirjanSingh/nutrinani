import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { WifiOff, Database, RefreshCw, Sparkles } from 'lucide-react';

export function SystemBanner() {
  const { data: status, refetch, isRefetching } = useSystemStatus();

  if (!status) return null;

  // Demo mode banner (non-intrusive)
  if (status.isDemoMode) {
    return (
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-primary font-medium">Demo Mode</span>
        <span className="text-muted-foreground">— using mock data, no backend connected</span>
      </div>
    );
  }

  // Backend down
  if (!status.backendUp) {
    return (
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              <strong>Backend unreachable</strong> — running in offline mode (read-only).
              <Badge variant="secondary" className="ml-2">Cached</Badge>
            </AlertDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  // DB down but backend up
  if (!status.dbUp) {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-50 border-yellow-200 text-yellow-800">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Database unavailable</strong> — some actions disabled. You can still browse cached data.
            </AlertDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return null;
}
