import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const recipes = {
  oats: {
    name: "Diabetes-friendly Oats Chilla",
    tags: ["Diabetes-safe", "High-fiber", "Veg"],
    description: "A nutritious, protein-rich savory pancake made with oats and vegetables. Perfect for breakfast or snack.",
    steps: [
      "Blend 1 cup oats into a coarse powder",
      "Mix with water, add finely chopped onions, tomatoes, and green chilies",
      "Add salt, turmeric, and cumin powder to taste",
      "Let the batter rest for 5 minutes",
      "Pour on a hot griddle and cook until golden brown on both sides",
      "Serve hot with mint chutney"
    ],
    shoppingList: [
      { item: "Oats", quantity: "200g", checked: false },
      { item: "Onions", quantity: "2 medium", checked: false },
      { item: "Tomatoes", quantity: "2 medium", checked: false },
      { item: "Green chilies", quantity: "3-4", checked: false },
      { item: "Turmeric powder", quantity: "1 tsp", checked: false },
      { item: "Cumin powder", quantity: "1 tsp", checked: false },
      { item: "Fresh mint leaves", quantity: "1 bunch", checked: false },
      { item: "Salt", quantity: "to taste", checked: false }
    ]
  },
  chana: {
    name: "PCOS-friendly Chana Salad",
    tags: ["PCOS-safe", "Protein-rich", "Veg"],
    description: "A refreshing chickpea salad packed with protein and fiber, ideal for hormonal balance.",
    steps: [
      "Soak 1 cup chana overnight and boil until soft",
      "Dice cucumber, tomatoes, and onions finely",
      "Mix vegetables with boiled chana",
      "Add lemon juice, chaat masala, and black salt",
      "Garnish with fresh coriander",
      "Chill and serve"
    ],
    shoppingList: [
      { item: "Chickpeas (Chana)", quantity: "250g", checked: false },
      { item: "Cucumber", quantity: "1 large", checked: false },
      { item: "Tomatoes", quantity: "2", checked: false },
      { item: "Onions", quantity: "1 medium", checked: false },
      { item: "Lemon", quantity: "2", checked: false },
      { item: "Chaat masala", quantity: "1 tbsp", checked: false },
      { item: "Black salt", quantity: "1/2 tsp", checked: false },
      { item: "Fresh coriander", quantity: "1 bunch", checked: false }
    ]
  }
};

export const Recipes = () => {
  const [selectedIngredient, setSelectedIngredient] = useState<"oats" | "chana">("oats");
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [showCommunityModal, setShowCommunityModal] = useState(false);

  const recipe = recipes[selectedIngredient];

  const toggleItem = (index: number) => {
    setCheckedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const markAllBought = () => {
    const allChecked: Record<number, boolean> = {};
    recipe.shoppingList.forEach((_, idx) => {
      allChecked[idx] = true;
    });
    setCheckedItems(allChecked);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Recipes & Shopping List</h2>
        <p className="text-muted-foreground">Get Nani-approved recipes tailored to your health needs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recipe Card */}
        <Card className="shadow-md border-border/50">
          <CardHeader>
            <CardTitle>Nani-approved Recipe</CardTitle>
            <CardDescription>Choose your base ingredient</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedIngredient} onValueChange={(val) => setSelectedIngredient(val as "oats" | "chana")}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oats">Oats</SelectItem>
                <SelectItem value="chana">Chana (Chickpeas)</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold">{recipe.name}</h3>
              
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="rounded-lg">
                    {tag}
                  </Badge>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">{recipe.description}</p>

              <div className="space-y-2 pt-2">
                <h4 className="font-semibold">Steps:</h4>
                <ol className="space-y-2 text-sm">
                  {recipe.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="font-semibold text-primary min-w-5">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shopping List Card */}
        <Card className="shadow-md border-border/50">
          <CardHeader>
            <CardTitle>Smart Shopping List</CardTitle>
            <CardDescription>Items needed for this recipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {recipe.shoppingList.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    checkedItems[idx]
                      ? "bg-muted/50 border-muted"
                      : "bg-card border-border hover:border-primary/30"
                  }`}
                >
                  <Checkbox
                    checked={checkedItems[idx] || false}
                    onCheckedChange={() => toggleItem(idx)}
                    id={`item-${idx}`}
                  />
                  <label
                    htmlFor={`item-${idx}`}
                    className={`flex-1 cursor-pointer text-sm ${
                      checkedItems[idx] ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    <span className="font-medium">{item.item}</span>
                    <span className="text-muted-foreground"> – {item.quantity}</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={markAllBought} className="flex-1 rounded-xl">
                Mark all as bought
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl">
                <MessageCircle className="w-4 h-4 mr-2" />
                Send to WhatsApp
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              WhatsApp integration available in full version
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Community CTA Banner */}
      <Card className="shadow-md border-primary/30 bg-accent/30">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold text-lg mb-1">Share this as a 'Nani ka Nuskha'</h3>
            <p className="text-sm text-muted-foreground">
              Help the NutriNani community by sharing your healthy recipes
            </p>
          </div>
          <Button onClick={() => setShowCommunityModal(true)} size="lg" className="rounded-xl">
            <Share2 className="w-4 h-4 mr-2" />
            Add to Community
          </Button>
        </CardContent>
      </Card>

      {/* Community Modal */}
      <Dialog open={showCommunityModal} onOpenChange={setShowCommunityModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Posted to Community (demo)</DialogTitle>
            <DialogDescription className="pt-2">
              In the real app, this would save to DynamoDB and run moderation using Rekognition + Comprehend.
              For now, imagine it's live. 😊
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowCommunityModal(false)} className="rounded-xl">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
