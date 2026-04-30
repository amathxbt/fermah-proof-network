import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, Database, Code } from "lucide-react";

export default function Docs() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Documentation</h1>
        <p className="text-muted-foreground">Understanding the Fermah Proof Network architecture.</p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            How It Works
          </h2>
          <Card className="bg-card border-border">
            <CardContent className="pt-6 prose prose-invert max-w-none">
              <p>
                Fermah is a permissionless network for zero-knowledge proof generation and verification. 
                It acts as a coordination layer between users who need proofs generated and proving nodes 
                that provide computational resources.
              </p>
              <ol className="list-decimal pl-6 space-y-2 mt-4">
                <li><strong>Submission:</strong> User submits circuit details, public inputs, and the hash of their private inputs.</li>
                <li><strong>Coordination:</strong> Fermah assigns the proving task to available network nodes.</li>
                <li><strong>Generation:</strong> Nodes compute the proof off-chain.</li>
                <li><strong>Verification:</strong> The proof is verified on the Base blockchain via smart contracts.</li>
                <li><strong>Resolution:</strong> The on-chain transaction hash is recorded, and the proof status is updated to Verified.</li>
              </ol>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Client-Side Privacy Design (CPD)
          </h2>
          <Card className="bg-card border-border">
            <CardContent className="pt-6 prose prose-invert max-w-none">
              <p>
                Fermah employs a strict Client-Side Privacy Design (CPD) model. 
                <strong> Your private inputs never leave your browser.</strong>
              </p>
              <p className="mt-4">
                Instead of sending raw private inputs to the network, the client computes a <code>keccak256</code> hash 
                of the private data. Only this hash, along with the public inputs, is transmitted. The proving nodes 
                use this hash to verify the integrity of the proof generation without ever seeing the underlying data.
              </p>
              <div className="bg-accent/50 p-4 rounded-md mt-4 border border-primary/20">
                <p className="text-sm text-primary font-mono m-0">
                  // CPD Hash Generation<br/>
                  const inputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(privateInputs));
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Onchain Transparency
          </h2>
          <Card className="bg-card border-border">
            <CardContent className="pt-6 prose prose-invert max-w-none">
              <p>
                Every successfully generated proof is submitted to the Base Sepolia testnet for cryptographic verification.
              </p>
              <p className="mt-4">
                The transaction hash provides an immutable, decentralized record that the proof was valid 
                for the given public inputs and circuit ID. You can track this verification independently 
                on Basescan, ensuring complete transparency of the Fermah network's operations.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
