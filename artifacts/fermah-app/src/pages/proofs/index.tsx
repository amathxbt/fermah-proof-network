import { useState } from "react";
import { useListProofs } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge, ProofTypeIcon } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, ChevronLeft, ChevronRight, Hash } from "lucide-react";
import { ListProofsStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export default function ProofExplorer() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ListProofsStatus | "all">("all");
  
  const { data, isLoading } = useListProofs(
    { 
      page, 
      limit: 10,
      ...(statusFilter !== "all" ? { status: statusFilter } : {})
    },
    { query: { keepPreviousData: true } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary mb-1">Proof Explorer</h1>
          <p className="text-muted-foreground">Browse all proofs generated and verified on the network.</p>
        </div>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search circuit ID or address..."
                className="pl-9 bg-background border-border text-sm"
              />
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={(val: any) => { setStatusFilter(val); setPage(1); }}
            >
              <SelectTrigger className="w-[180px] bg-background border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground font-mono">
            {data?.total ? `${data.total} records` : '...'}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-accent/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[250px] font-mono text-xs">Proof ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="font-mono text-xs">Circuit ID</TableHead>
                <TableHead className="font-mono text-xs">Submitter</TableHead>
                <TableHead className="text-right">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && !data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-4 w-32 bg-muted/50" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-muted/50" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full bg-muted/50" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 bg-muted/50" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 bg-muted/50" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 bg-muted/50 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.proofs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Hash className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium">No proofs found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.proofs.map((proof) => (
                  <TableRow key={proof.id} className="border-border hover:bg-accent/50 cursor-pointer group transition-colors">
                    <TableCell className="font-mono text-xs text-primary group-hover:underline">
                      <Link href={`/proofs/${proof.id}`}>{proof.id}</Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ProofTypeIcon type={proof.proofType} />
                        <span className="text-sm uppercase tracking-wider font-bold text-muted-foreground">{proof.proofType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={proof.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {proof.circuitId.slice(0, 10)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {proof.submitter.slice(0, 6)}...{proof.submitter.slice(-4)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(proof.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {data && data.total > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between bg-accent/20">
              <div className="text-sm text-muted-foreground">
                Page {data.page} of {Math.ceil(data.total / data.limit)}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-border"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(data.total / data.limit)}
                  className="border-border"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
