import { ActivityEventType, ProofStatusProperty, ProofStatusStatus } from "@workspace/api-client-react/src/generated/api.schemas";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Send, Cpu, Database, Binary, FileCode2 } from "lucide-react";

export function StatusBadge({ status }: { status: ProofStatusProperty | ProofStatusStatus }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          <Clock className="w-3 h-3 mr-1" />
          PENDING
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Send className="w-3 h-3 mr-1" />
          SUBMITTED
        </Badge>
      );
    case "verified":
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          VERIFIED
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="w-3 h-3 mr-1" />
          FAILED
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ProofTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "groth16":
      return <Cpu className="w-4 h-4 text-primary" />;
    case "plonk":
      return <Database className="w-4 h-4 text-purple-400" />;
    case "fflonk":
      return <Binary className="w-4 h-4 text-pink-400" />;
    case "risc0":
      return <FileCode2 className="w-4 h-4 text-orange-400" />;
    default:
      return <Cpu className="w-4 h-4 text-muted-foreground" />;
  }
}
