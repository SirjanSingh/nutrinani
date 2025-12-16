import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanBarcode, Upload, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const mockProduct = {
  name: "ChocoFit Protein Bar",
  ingredients: [
    "Whey protein concentrate",
    "Maltodextrin",
    "E322 (Soy lecithin)",
    "Artificial sweetener (955)",
    "Added sugar",
    "Milk solids",
    "Cocoa powder",
    "Natural flavors"
  ],
  verdict: {
    title: "⚠️ Not ideal for Diabetes",
    description: "Contains added sugar and artificial sweeteners which may spike blood glucose levels.",
    riskScore: 72,
    details: [
      { label: "Contains nuts", value: "No", safe: true },
      { label: "Contains lactose", value: "Yes", safe: false },
      { label: "High sugar", value: "Yes", safe: false },
      { label: "Diabetes safe", value: "No", safe: false },
    ]
  }
};

export const Scanner = () => {
  const [scanning, setScanning] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setShowResult(false);
    
    setTimeout(() => {
      setScanning(false);
      setShowResult(true);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Scan & Verdict</h2>
        <p className="text-muted-foreground">Scan product labels to get personalized safety analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Panel */}
        <Card className="shadow-md border-border/50">
          <CardHeader>
            <CardTitle>Scan product label</CardTitle>
            <CardDescription>Point your camera at the barcode or ingredient list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-square bg-muted rounded-2xl flex items-center justify-center border-2 border-dashed border-border">
              {scanning ? (
                <div className="text-center space-y-4">
                  <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing ingredients with NutriNani's GenAI...</p>
                </div>
              ) : (
                <ScanBarcode className="w-24 h-24 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleScan}
                disabled={scanning}
                size="lg"
                className="w-full rounded-xl"
              >
                <ScanBarcode className="w-5 h-5 mr-2" />
                Scan demo barcode
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                disabled
                className="w-full rounded-xl"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload image (disabled in demo)
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Demo mode: Click "Scan demo barcode" to see sample analysis
            </p>
          </CardContent>
        </Card>

        {/* Results Panel */}
        {showResult && (
          <Card className="shadow-md border-border/50 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <span>{mockProduct.name}</span>
              </CardTitle>
              <CardDescription>Ingredient analysis complete</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ingredients List */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Ingredients detected:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {mockProduct.ingredients.map((ingredient, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs rounded-lg">
                      {ingredient}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Verdict Card */}
              <Card className="bg-warning/10 border-warning/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <span>Personalized verdict for you</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">{mockProduct.verdict.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Risk Score</span>
                        <span className="font-semibold">{mockProduct.verdict.riskScore}/100</span>
                      </div>
                      <Progress value={mockProduct.verdict.riskScore} className="h-2" />
                    </div>
                  </div>

                  {/* Detail Pills */}
                  <div className="grid grid-cols-2 gap-2">
                    {mockProduct.verdict.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-3 rounded-xl border ${
                          detail.safe
                            ? "bg-success/10 border-success/30"
                            : "bg-destructive/10 border-destructive/30"
                        }`}
                      >
                        {detail.safe ? (
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        )}
                        <div className="text-xs">
                          <div className="font-medium">{detail.label}</div>
                          <div className="text-muted-foreground">{detail.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
