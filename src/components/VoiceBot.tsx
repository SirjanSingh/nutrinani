import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff } from "lucide-react";

const responses = {
  hindi: {
    query: "Mujhe raat se khansi ho rahi hai, kya karun?",
    response: "Beta, garam paani mein shehad aur adrak ka ras mila kar piyo. Tulsi ke patte chaba sakte ho. Lekin yaad rakhna, yeh sirf ghar ka nuskha hai. Agar 2-3 din mein theek na ho toh doctor se zaroor milna."
  },
  english: {
    query: "I have a cough since last night, what should I do?",
    response: "Dear, drink warm water with honey and ginger juice. You can chew some tulsi leaves. But remember, this is just a home remedy. If it doesn't get better in 2-3 days, please consult a doctor."
  },
  hinglish: {
    query: "Mujhe raat se cough ho rahi hai, kya karu?",
    response: "Beta, warm water mein honey aur ginger ka juice mix karke piyo. Tulsi leaves chew kar sakte ho. But yaad rakhna, yeh sirf general advice hai. Agar 2-3 days mein better na ho toh doctor se consult karna."
  },
  punjabi: {
    query: "Mere nu raat ton khasi aa rahi hai, ki karan?",
    response: "Puttar, garam paani vich shahad te adrak da ras mila ke piyo. Tulsi de patte chaba sakte ho. Par yaad rakhna, eh sirf ghar da nuskha hai. Je 2-3 din vich theek na hove taan doctor nu zaroor milna."
  }
};

export const VoiceBot = () => {
  const [language, setLanguage] = useState<keyof typeof responses>("hindi");
  const [isRecording, setIsRecording] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  const handleMicClick = () => {
    if (!isRecording) {
      setIsRecording(true);
      setShowConversation(false);
      
      setTimeout(() => {
        setIsRecording(false);
        setShowConversation(true);
      }, 2000);
    }
  };

  const conversation = responses[language];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Nani Voice Bot</h2>
        <p className="text-muted-foreground">Ask Nani for trusted home remedies in your language</p>
      </div>

      <Card className="shadow-lg border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ask Nani for a home remedy</CardTitle>
              <CardDescription>Speak naturally in your preferred language</CardDescription>
            </div>
            <Select value={language} onValueChange={(val) => setLanguage(val as keyof typeof responses)}>
              <SelectTrigger className="w-40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hinglish">Hinglish</SelectItem>
                <SelectItem value="punjabi">Punjabi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mic Button */}
          <div className="flex flex-col items-center gap-4 py-8">
            <Button
              onClick={handleMicClick}
              size="lg"
              className={`w-24 h-24 rounded-full shadow-lg transition-all ${
                isRecording
                  ? "bg-destructive hover:bg-destructive/90 animate-pulse-soft"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isRecording ? (
                <MicOff className="w-10 h-10" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </Button>
            
            <p className="text-sm text-muted-foreground text-center">
              {isRecording ? "Listening... tell Nani your problem" : "Tap the mic to start"}
            </p>
          </div>

          {/* Conversation */}
          {showConversation && (
            <div className="space-y-4 animate-fade-in">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-md">
                  <p className="text-sm">{conversation.query}</p>
                </div>
              </div>

              {/* Nani's Response */}
              <div className="flex justify-start">
                <div className="bg-accent text-accent-foreground rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
                  <p className="text-sm font-medium mb-2">Nani says:</p>
                  <p className="text-sm">{conversation.response}</p>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Demo only – In production, we use AWS Transcribe, Bedrock, and Polly for full voice ↔ text ↔ voice.
              This simulates the multilingual voice assistant experience.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
