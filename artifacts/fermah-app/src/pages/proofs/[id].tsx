import { useParams, Link } from "wouter";
import { useGetProof, useGetProofStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge, ProofTypeIcon } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Clock, Server, FileDigit, Hash, Activity, ShieldCheck, Copy, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getGetProofQueryKey } from "@workspace/api-client-react";

export default function ProofDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  const { data: proof, isLoading } = useGetProof(id || "", { 
    query: { enabled: !!id } 
  });

  const isPolling = proof?.status === "pending" || proof?.status === "submitted";

  const { data: statusData } = useGetProofStatus(id || "", {
    query: {
      enabled: !!id && isPolling,
      refetchInterval: isPolling ? 5000 : false, // Poll every 5s if pending/submitted
    }
  });

  // When polling returns a new status, update the main proof cache
  useEffect(() => {
    if (statusData && id && proof && statusData.status !== proof.status) {
      queryClient.setQueryData(getGetProofQueryKey(id), (old: any) => 
        old ? { 
          ...old, 
          status: statusData.status,
          fermahJobId: statusData.fermahJobId || old.fermahJobId,
          txHash: statusData.txHash || old.txHash,
          blockNumber: statusData.blockNumber || old.blockNumber
        } : old
      );
    }
  }, [statusData, id, queryClient, proof]);

  if (isLoading || !proof) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-muted/50" />
        <Skeleton className="h-64 w-full bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/proofs" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-primary">Proof Details</h1>
              <StatusBadge status={proof.status} />
            </div>
            <p className="text-muted-foreground font-mono text-sm">{proof.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="bg-accent/30 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileDigit className="h-5 w-5 text-primary" />
                Proof Payload
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <DataRow 
                  label="Circuit ID" 
                  value={proof.circuitId} 
                  copyable
                />
                <DataRow 
                  label="Submitter Address" 
                  value={proof.submitter} 
                  copyable
                />
                <DataRow 
                  label="Proof System" 
                  value={
                    <div className="flex items-center gap-2">
                      <ProofTypeIcon type={proof.proofType} />
                      <span className="uppercase tracking-wider font-bold">{proof.proofType}</span>
                    </div>
                  } 
                />
                <DataRow 
                  label="Creation Time" 
                  value={format(new Date(proof.createdAt), "MMM d, yyyy HH:mm:ss 'UTC'")} 
                />
                <DataRow 
                  label="Last Updated" 
                  value={format(new Date(proof.updatedAt), "MMM d, yyyy HH:mm:ss 'UTC'")} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-md">
            <CardHeader className="bg-accent/30 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" />
                Cryptographic Artifacts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <div className="p-4 bg-primary/5">
                  <div className="text-sm font-bold text-muted-foreground mb-1 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    CPD Input Hash (Private)
                  </div>
                  <div className="font-mono text-sm break-all text-primary/80">
                    {proof.inputHash}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="text-sm font-bold text-muted-foreground mb-1">Generated Proof Hash</div>
                  {proof.proofHash ? (
                    <div className="font-mono text-sm break-all">{proof.proofHash}</div>
                  ) : (
                    <div className="text-sm italic text-muted-foreground">Pending generation...</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Network Execution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Fermah Job ID</div>
                {proof.fermahJobId ? (
                  <div className="font-mono text-sm bg-accent p-2 rounded border border-border">
                    {proof.fermahJobId}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Awaiting assignment...</div>
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Base Sepolia Verification</div>
                {proof.txHash ? (
                  <a 
                    href={`https://sepolia.basescan.org/tx/${proof.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="font-mono text-sm break-all">{proof.txHash.slice(0, 14)}...{proof.txHash.slice(-10)}</span>
                  </a>
                ) : (
                  <div className="text-sm text-muted-foreground">Not verified on-chain yet.</div>
                )}
              </div>
              
              {proof.blockNumber && (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Block Number</div>
                  <div className="font-mono text-sm text-primary">{proof.blockNumber}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {isPolling && (
            <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-accent/50 border border-border text-sm text-muted-foreground animate-pulse">
              <Activity className="h-4 w-4 text-primary" />
              Polling for status updates...
            </div>
          )}

          {proof.errorMessage && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-sm font-bold text-red-500 mb-1">Error</div>
              <div className="text-sm text-red-400/90 font-mono">{proof.errorMessage}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value, copyable = false }: { label: string, value: React.ReactNode, copyable?: boolean }) {
  return (
    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-accent/30 transition-colors">
      <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-3 max-w-full overflow-hidden">
        {typeof value === 'string' ? (
          <span className="font-mono text-sm text-foreground truncate" title={value}>{value}</span>
        ) : (
          value
        )}
        {copyable && typeof value === 'string' && (
          <button 
            onClick={() => navigator.clipboard.writeText(value)}
            className="text-muted-foreground hover:text-primary transition-colors p-1"
            title="Copy to clipboard"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
