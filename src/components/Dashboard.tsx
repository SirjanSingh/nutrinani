import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

const conditions = ["Diabetes", "PCOS", "Hypertension", "High Cholesterol"];
const allergies = ["Lactose intolerance", "Gluten allergy", "Nut allergy", "Soy allergy"];
const dietTypes = ["Vegetarian", "Jain", "Vegan", "Eggitarian"];

export const Dashboard = () => {
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const toggleSelection = (item: string, list: string[], setList: (list: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Welcome beta, Sirjan 👋</h2>
        <p className="text-muted-foreground">Tell NutriNani your health profile so we can decode labels safely.</p>
      </div>

      <Card className="shadow-md border-border/50">
        <CardHeader>
          <CardTitle>Basic details</CardTitle>
          <CardDescription>Help us personalize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="65"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="170"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Activity Level</Label>
            <Select value={activity} onValueChange={setActivity}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-border/50">
        <CardHeader>
          <CardTitle>Conditions & Allergies</CardTitle>
          <CardDescription>Select all that apply to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Medical Conditions</Label>
            <div className="flex flex-wrap gap-2">
              {conditions.map((condition) => (
                <Badge
                  key={condition}
                  variant={selectedConditions.includes(condition) ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-2 rounded-full transition-all ${
                    selectedConditions.includes(condition)
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => toggleSelection(condition, selectedConditions, setSelectedConditions)}
                >
                  {condition}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Allergies</Label>
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy) => (
                <Badge
                  key={allergy}
                  variant={selectedAllergies.includes(allergy) ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-2 rounded-full transition-all ${
                    selectedAllergies.includes(allergy)
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => toggleSelection(allergy, selectedAllergies, setSelectedAllergies)}
                >
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Dietary Preference</Label>
            <div className="flex flex-wrap gap-2">
              {dietTypes.map((diet) => (
                <Badge
                  key={diet}
                  variant={selectedDiet.includes(diet) ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-2 rounded-full transition-all ${
                    selectedDiet.includes(diet)
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => toggleSelection(diet, selectedDiet, setSelectedDiet)}
                >
                  {diet}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} size="lg" className="rounded-xl">
          Save health profile
        </Button>
        {saved && (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Profile saved · last updated just now</span>
          </div>
        )}
      </div>
    </div>
  );
};
