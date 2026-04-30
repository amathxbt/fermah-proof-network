import { useGetNetworkStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ShieldCheck, Clock, Users, Hash, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetNetworkStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 10 });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Network Dashboard</h1>
          <p className="text-muted-foreground">Live telemetry from the Fermah proving network.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/submit">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide">
              SUBMIT PROOF
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="outline" className="border-border">
              READ DOCS
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Proofs" 
          value={stats?.totalProofs} 
          icon={<Hash className="h-4 w-4 text-primary" />} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Verified" 
          value={stats?.verifiedProofs} 
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Success Rate" 
          value={stats ? `${Math.round(stats.successRate)}%` : undefined} 
          icon={<ShieldCheck className="h-4 w-4 text-primary" />} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Avg Time" 
          value={stats ? `${stats.avgProofTime}s` : undefined} 
          icon={<Clock className="h-4 w-4 text-muted-foreground" />} 
          loading={statsLoading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Recent Network Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full bg-muted/50" />
                  ))}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map((event, i) => (
                    <div 
                      key={event.id} 
                      className="flex items-start justify-between p-4 rounded-lg bg-accent/50 border border-border/50 hover:bg-accent transition-colors"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {event.type === 'verified' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                          {event.type === 'submitted' && <Activity className="h-5 w-5 text-blue-500" />}
                          {event.type === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-foreground">
                              Proof {event.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {event.circuitId.slice(0, 12)}...
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            By {event.submitter.slice(0, 6)}...{event.submitter.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </div>
                        <Link href={`/proofs/${event.proofId}`} className="text-xs text-primary hover:underline">
                          View details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="bg-card border-border shadow-md h-full">
            <CardHeader>
              <CardTitle className="text-lg">Network Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-2">Supported Systems</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-accent text-xs font-bold border border-border">GROTH16</span>
                  <span className="px-2 py-1 rounded bg-accent text-xs font-bold border border-border">PLONK</span>
                  <span className="px-2 py-1 rounded bg-accent text-xs font-bold border border-border">FFLONK</span>
                  <span className="px-2 py-1 rounded bg-accent text-xs font-bold border border-border">RISC0</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-2">Network Architecture</h3>
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                  Fermah coordinates proving tasks across a decentralized network of GPUs, submitting verification results to Base.
                </p>
                <div className="text-xs space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Target Chain:</span>
                    <span className="text-primary font-mono">Base Sepolia</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Privacy Model:</span>
                    <span className="text-primary font-mono">CPD Hash</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, loading }: { title: string, value?: string | number, icon: React.ReactNode, loading: boolean }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 bg-muted/50" />
        ) : (
          <div className="text-2xl font-bold font-mono tracking-tight text-primary">{value ?? '-'}</div>
        )}
      </CardContent>
    </Card>
  );
}
