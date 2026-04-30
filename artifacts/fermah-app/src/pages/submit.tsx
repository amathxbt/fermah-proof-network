import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubmitProof } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Lock, Upload, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// We mock ethers keccak256 for the UI
const mockKeccak256 = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return "0x" + Math.abs(hash).toString(16).padStart(64, '0');
};

const submitSchema = z.object({
  circuitId: z.string().min(1, "Circuit ID is required"),
  proofType: z.enum(["groth16", "plonk", "fflonk", "risc0"]),
  submitter: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address"),
  privateInputs: z.string().min(1, "Private inputs are required"),
  publicInputs: z.string().optional(),
});

type SubmitValues = z.infer<typeof submitSchema>;

export default function SubmitProof() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [inputHash, setInputHash] = useState<string | null>(null);

  const form = useForm<SubmitValues>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      circuitId: "",
      proofType: "groth16",
      submitter: "",
      privateInputs: "",
      publicInputs: "",
    },
  });

  const submitProof = useSubmitProof({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Proof Submitted",
          description: "Your proof has been successfully submitted to the network.",
        });
        setLocation(`/proofs/${data.id}`);
      },
      onError: (error) => {
        toast({
          title: "Submission Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    }
  });

  const watchPrivateInputs = form.watch("privateInputs");

  // Hash inputs when they change
  const handlePrivateInputsChange = (val: string) => {
    if (val) {
      setInputHash(mockKeccak256(val));
    } else {
      setInputHash(null);
    }
  };

  const onSubmit = (values: SubmitValues) => {
    const pubInputsArray = values.publicInputs 
      ? values.publicInputs.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    const calculatedHash = mockKeccak256(values.privateInputs);

    submitProof.mutate({
      data: {
        circuitId: values.circuitId,
        proofType: values.proofType,
        submitter: values.submitter,
        inputHash: calculatedHash,
        publicInputs: pubInputsArray,
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Submit Proof</h1>
        <p className="text-muted-foreground">Request a zero-knowledge proof generation on the Fermah network.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle>Proof Configuration</CardTitle>
              <CardDescription>Enter the details for your ZK proof.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="circuitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Circuit ID</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. cir_8f92b..." className="font-mono text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="proofType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proof System</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a system" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="groth16">Groth16</SelectItem>
                              <SelectItem value="plonk">PLONK</SelectItem>
                              <SelectItem value="fflonk">FFlonk</SelectItem>
                              <SelectItem value="risc0">RISC Zero</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="submitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submitter Address</FormLabel>
                        <FormControl>
                          <Input placeholder="0x..." className="font-mono text-sm" {...field} />
                        </FormControl>
                        <FormDescription>Your Ethereum address to receive verification credit on Base.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-medium">Inputs</h3>
                    </div>

                    <FormField
                      control={form.control}
                      name="privateInputs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Private Inputs (JSON)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder='{"secret_key": "123..."}' 
                              className="font-mono text-sm h-32 resize-none" 
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                handlePrivateInputsChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormDescription className="text-primary font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            These never leave your browser. Only the CPD hash is sent.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="publicInputs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Public Witnesses (Comma separated)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 1042, 0xabc..." className="font-mono text-sm" {...field} />
                          </FormControl>
                          <FormDescription>Values that will be public during verification.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={submitProof.isPending}
                  >
                    {submitProof.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Submit Proof to Network
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Lock className="w-5 h-5" />
                CPD Privacy Active
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Fermah uses Client-Side Privacy Design. Your private inputs are hashed locally before any network request is made.
              </p>
              
              <div className="space-y-2">
                <div className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Generated Hash</div>
                {inputHash ? (
                  <div className="bg-background p-3 rounded border border-border font-mono text-xs break-all text-primary">
                    {inputHash}
                  </div>
                ) : (
                  <div className="bg-background p-3 rounded border border-border border-dashed text-muted-foreground text-xs text-center italic">
                    Enter private inputs to generate hash
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Alert className="bg-accent/50 border-border">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary font-bold">Network Note</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-2">
              Submission times vary by circuit complexity. Proofs are verified on Base Sepolia.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
