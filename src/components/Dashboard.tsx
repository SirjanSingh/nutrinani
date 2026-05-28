import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePantryItems } from '@/hooks/useApi';
import { calculateAge } from '@/lib/onboarding';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Heart,
  Shield,
  Sparkles,
  ChefHat,
  Scan,
  Bot,
  Package,
  ArrowRight,
  Leaf,
  Star,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  Utensils,
  Flame,
  Lightbulb,
  LogIn,
  CalendarClock,
  Check,
  Droplet,
  Target,
  ChevronRight,
  Sparkle,
} from 'lucide-react';

interface DashboardProps {
  onNavigateToSection?: (section: string) => void;
}

/* ---------- Helpers ---------- */

const NUTRITION_TIPS = [
  { tip: "Drink a glass of water first thing in the morning to kickstart metabolism.", source: "Hydration 101" },
  { tip: "Add a fistful of greens to at least one meal a day — your gut will thank you.", source: "Fiber & gut health" },
  { tip: "Swap refined sugar with jaggery or dates in your evening chai.", source: "Traditional Indian wisdom" },
  { tip: "Soak almonds overnight to boost nutrient absorption.", source: "Ayurvedic practice" },
  { tip: "Eat your largest meal before sunset — it aligns with your circadian rhythm.", source: "Chrono-nutrition" },
  { tip: "Add a pinch of turmeric to warm milk before bed to fight inflammation.", source: "Haldi doodh wisdom" },
  { tip: "Chew each bite 20 times — it helps digestion and satiety signals.", source: "Mindful eating" },
  { tip: "A handful of mixed nuts beats most packaged snacks — every time.", source: "Smart snacking" },
  { tip: "Read the label: if you can't pronounce it, your body probably can't process it either.", source: "Label-reading 101" },
  { tip: "Pair iron-rich foods (spinach, dal) with vitamin C (lemon) for better absorption.", source: "Nutrient pairing" },
  { tip: "Fermented foods like curd, kanji, and idli batter feed your gut bacteria.", source: "Probiotics" },
  { tip: "Cook with ghee in moderation — it has a high smoke point and is rich in butyrate.", source: "Healthy fats" },
  { tip: "Don't skip breakfast. A protein-rich start steadies blood sugar all day.", source: "Macro balance" },
  { tip: "Replace one cup of tea with jeera or saunf water this week.", source: "Digestive teas" },
];

const DAILY_CHALLENGES = [
  { title: "Drink 8 glasses of water today", emoji: "💧" },
  { title: "Add a green vegetable to lunch", emoji: "🥬" },
  { title: "Try a fruit you haven't had in a month", emoji: "🍇" },
  { title: "Replace one packaged snack with a homemade one", emoji: "🥜" },
  { title: "Eat one meal without any screens", emoji: "🍽️" },
  { title: "Walk for 20 minutes after dinner", emoji: "🚶" },
  { title: "Sleep before 10:30 PM tonight", emoji: "🌙" },
  { title: "Skip refined sugar for the entire day", emoji: "🚫🍭" },
  { title: "Have a fistful of nuts as a mid-day snack", emoji: "🌰" },
  { title: "Cook a warm meal from scratch", emoji: "🍲" },
  { title: "Start the day with warm jeera water", emoji: "🫖" },
  { title: "Add a probiotic (curd / kanji) to your day", emoji: "🥣" },
  { title: "Eat the rainbow — 3 different coloured veggies", emoji: "🌈" },
  { title: "Chew each bite at least 20 times", emoji: "😌" },
];

type MealIdea = { title: string; desc: string; emoji: string };

const MEAL_IDEAS: Record<string, MealIdea[]> = {
  morning: [
    { emoji: "🥣", title: "Oats porridge", desc: "With banana, soaked almonds and a drizzle of honey." },
    { emoji: "🍳", title: "Vegetable poha", desc: "With peanuts, lemon and a side of curd." },
    { emoji: "🥞", title: "Besan chilla", desc: "With mint chutney and a cup of green tea." },
    { emoji: "🌱", title: "Sprouts salad", desc: "Sprouted moong with cucumber, tomato, chaat masala." },
    { emoji: "🥘", title: "Ragi dosa", desc: "Crispy ragi dosa with coconut chutney." },
  ],
  lunch: [
    { emoji: "🍛", title: "Classic thali", desc: "Dal + brown rice + sabzi + curd. Balanced and grounding." },
    { emoji: "🥗", title: "Rajma chawal", desc: "With a side of kachumber salad and yogurt." },
    { emoji: "🍚", title: "Vegetable pulao", desc: "With cool raita and roasted papad." },
    { emoji: "🌾", title: "Quinoa khichdi", desc: "With mixed seasonal vegetables and ghee." },
    { emoji: "🫓", title: "Paneer & dal plate", desc: "Roti + paneer bhurji + dal tadka + green salad." },
  ],
  snack: [
    { emoji: "🌰", title: "Roasted chana", desc: "A handful with a cup of green tea. Crunchy and protein-rich." },
    { emoji: "🥗", title: "Sprouts chaat", desc: "Sprouts tossed with lemon, onion, tomato and chaat masala." },
    { emoji: "🍿", title: "Ghee-roasted makhana", desc: "Light, crunchy and a fraction of the calories of chips." },
    { emoji: "🍎", title: "Apple + peanut butter", desc: "Sliced apple with a dollop of natural peanut butter." },
    { emoji: "🥒", title: "Cucumber sticks + hummus", desc: "Cool, fresh, and surprisingly filling." },
  ],
  dinner: [
    { emoji: "🍲", title: "Moong dal khichdi", desc: "With ghee and roasted vegetables. Easy on digestion." },
    { emoji: "🥬", title: "Palak paneer + roti", desc: "Multigrain roti with palak paneer and a small bowl of dal." },
    { emoji: "🍚", title: "Veggie stir-fry", desc: "Quinoa or millet base with a colourful stir-fry on top." },
    { emoji: "🥞", title: "Moong dal cheela", desc: "Two cheelas with mint chutney. Light and protein-forward." },
    { emoji: "🫓", title: "Bajra roti plate", desc: "Bajra roti, sabzi, dal and a spoon of ghee." },
  ],
  late: [
    { emoji: "🥛", title: "Haldi doodh", desc: "Warm turmeric milk with a pinch of black pepper. Sleep mode on." },
    { emoji: "🌿", title: "Chamomile tea", desc: "A cup of chamomile to settle your system before bed." },
    { emoji: "🌰", title: "Almonds + warm water", desc: "5–6 soaked almonds and a glass of warm water." },
    { emoji: "🍌", title: "Mini banana bite", desc: "Half a banana with a touch of peanut butter. Small portion." },
  ],
};

function getDailyTip() {
  return pickDaily(NUTRITION_TIPS);
}

function getDailyChallenge() {
  return pickDaily(DAILY_CHALLENGES);
}

function pickDaily<T>(arr: T[]): T {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return arr[dayOfYear % arr.length];
}

function getTimeContext() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) {
    return {
      greeting: 'Good morning',
      Icon: Sunrise,
      iconColor: 'text-amber-500',
      gradient: 'from-amber-50 to-orange-50',
      mealLabel: 'Breakfast ideas',
      mealIcon: Coffee,
      ideasKey: 'morning' as const,
    };
  }
  if (hour >= 11 && hour < 15) {
    return {
      greeting: 'Good afternoon',
      Icon: Sun,
      iconColor: 'text-yellow-500',
      gradient: 'from-yellow-50 to-amber-50',
      mealLabel: 'Lunch ideas',
      mealIcon: Utensils,
      ideasKey: 'lunch' as const,
    };
  }
  if (hour >= 15 && hour < 18) {
    return {
      greeting: 'Good afternoon',
      Icon: Sun,
      iconColor: 'text-orange-500',
      gradient: 'from-orange-50 to-rose-50',
      mealLabel: 'Snack ideas',
      mealIcon: Coffee,
      ideasKey: 'snack' as const,
    };
  }
  if (hour >= 18 && hour < 22) {
    return {
      greeting: 'Good evening',
      Icon: Moon,
      iconColor: 'text-indigo-500',
      gradient: 'from-indigo-50 to-purple-50',
      mealLabel: 'Dinner ideas',
      mealIcon: Utensils,
      ideasKey: 'dinner' as const,
    };
  }
  return {
    greeting: 'Late night',
    Icon: Moon,
    iconColor: 'text-slate-400',
    gradient: 'from-slate-50 to-indigo-50',
    mealLabel: 'Late-night ideas',
    mealIcon: Coffee,
    ideasKey: 'late' as const,
  };
}

function useStreak(enabled: boolean) {
  const [state, setState] = useState<{ count: number; best: number }>(() => ({ count: 0, best: 0 }));

  useEffect(() => {
    if (!enabled) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const raw = localStorage.getItem('nutrinani_streak');
      const prev = raw ? JSON.parse(raw) as { lastVisit?: string; count?: number; best?: number } : {};
      let count = prev.count ?? 0;
      let best = prev.best ?? 0;

      if (prev.lastVisit !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        count = prev.lastVisit === yesterday ? count + 1 : 1;
        best = Math.max(best, count);
        localStorage.setItem('nutrinani_streak', JSON.stringify({ lastVisit: today, count, best }));
      }
      setState({ count: Math.max(1, count), best: Math.max(best, count, 1) });
    } catch {
      setState({ count: 1, best: 1 });
    }
  }, [enabled]);

  return state;
}

/* ---------- Card Stack: Meal Ideas ---------- */

function MealIdeasStack({ ideas, onSeeMore }: { ideas: MealIdea[]; onSeeMore: () => void }) {
  const [idx, setIdx] = useState(0);
  const [outgoing, setOutgoing] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('left');

  const dismiss = (dir: 'left' | 'right' = 'left') => {
    if (outgoing) return;
    setDirection(dir);
    setOutgoing(true);
    window.setTimeout(() => {
      setIdx((i) => (i + 1) % ideas.length);
      setOutgoing(false);
    }, 320);
  };

  const visibleCount = Math.min(3, ideas.length);
  const remaining = ideas.length - 1;

  return (
    <div className="relative w-full">
      <div className="relative h-[160px] select-none">
        {ideas.map((idea, ideaIdx) => {
          const relativePos = (ideaIdx - idx + ideas.length) % ideas.length;
          if (relativePos >= visibleCount) return null;
          const isTop = relativePos === 0;
          const isOutgoing = isTop && outgoing;

          const baseTransform = `scale(${1 - relativePos * 0.05}) translateY(${relativePos * 10}px)`;
          const exitTransform =
            direction === 'left'
              ? 'translateX(-130%) rotate(-14deg)'
              : 'translateX(130%) rotate(14deg)';

          return (
            <div
              key={ideaIdx}
              onClick={() => isTop && dismiss('left')}
              style={{
                zIndex: 10 - relativePos,
                transform: isOutgoing ? exitTransform : baseTransform,
                opacity: isOutgoing ? 0 : 1,
                cursor: isTop ? 'pointer' : 'default',
              }}
              className={cn(
                "absolute inset-0 rounded-2xl border-2 shadow-lg p-5 flex flex-col",
                "transition-all duration-300 ease-out",
                // Alternating warm gradients so the stack feels layered & lively
                ideaIdx % 3 === 0 && "bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border-emerald-200",
                ideaIdx % 3 === 1 && "bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50 border-orange-200",
                ideaIdx % 3 === 2 && "bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 border-violet-200",
                isTop && !isOutgoing && "hover:shadow-xl hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none drop-shadow-sm">{idea.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{idea.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{idea.desc}</p>
                </div>
              </div>

              {isTop && (
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); dismiss('left'); }}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    Skip <ChevronRight className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSeeMore(); }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 bg-white/60 px-2 py-1 rounded-md"
                  >
                    Cook this <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Indicator dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {ideas.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === idx ? "w-5 bg-green-600" : "w-1.5 bg-muted-foreground/30"
            )}
          />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">
          Tap to see {remaining} more
        </span>
      </div>
    </div>
  );
}

/* ---------- Inventory Snapshot ---------- */

function InventorySnapshot({ onNavigate }: { onNavigate?: (s: string) => void }) {
  const { data: pantryItems, isLoading } = usePantryItems();
  const items = Array.isArray(pantryItems) ? pantryItems : [];

  const daysUntil = (d?: string) => {
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  };

  const expiring = items
    .map(i => ({ item: i, days: daysUntil(i.expiryDate) }))
    .filter(x => x.days !== null && x.days! <= 5)
    .sort((a, b) => (a.days! - b.days!))
    .slice(0, 3);

  const expired = expiring.filter(x => x.days! < 0).length;

  return (
    <Card className="border-2 border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 md:flex-shrink-0">
          <div className="p-2 rounded-lg bg-amber-100">
            <Package className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Pantry Snapshot</div>
            <div className="text-xs text-muted-foreground">What's running out</div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="px-2.5 py-1 rounded-full bg-white/70 text-xs font-medium border border-amber-200">
            <span className="font-bold text-amber-700">{isLoading ? '…' : items.length}</span>
            <span className="text-muted-foreground ml-1">in pantry</span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/70 text-xs font-medium border border-orange-200">
            <span className="font-bold text-orange-600">{isLoading ? '…' : expiring.length}</span>
            <span className="text-muted-foreground ml-1">expiring</span>
          </span>
          {expired > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-white/70 text-xs font-medium border border-red-200">
              <span className="font-bold text-red-600">{expired}</span>
              <span className="text-muted-foreground ml-1">expired</span>
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
          {expiring.length > 0 ? (
            expiring.map(({ item, days }) => (
              <Badge
                key={item.id}
                variant={days! < 0 ? 'destructive' : 'outline'}
                className="text-xs bg-white/70"
              >
                {item.name} · {days! < 0 ? 'expired' : days === 0 ? 'today' : `${days}d`}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground italic">Nothing expiring soon ✨</span>
          )}
        </div>

        <div className="flex gap-2 md:flex-shrink-0">
          {expiring.length > 0 && (
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => onNavigate?.('recipes')}>
              <ChefHat className="mr-1.5 h-3.5 w-3.5" />
              Rescue
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onNavigate?.('inventory')}>
            Open
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Daily Challenge ---------- */

function DailyChallengeCard({ onGenerateRecipe }: { onGenerateRecipe?: () => void }) {
  const challenge = useMemo(() => getDailyChallenge(), []);
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `nutrinani_challenge_${today}`;
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(localStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  const toggle = () => {
    const next = !done;
    setDone(next);
    if (next) localStorage.setItem(storageKey, 'true');
    else localStorage.removeItem(storageKey);
  };

  return (
    <Card
      className={cn(
        "border-2 transition-colors",
        done
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50"
          : "border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50"
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className={cn("h-5 w-5", done ? "text-emerald-600" : "text-violet-600")} />
          Today's challenge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">{challenge.emoji}</span>
          <p className={cn(
            "text-base font-medium flex-1",
            done && "line-through text-muted-foreground"
          )}>
            {challenge.title}
          </p>
        </div>
        <Button
          onClick={toggle}
          className={cn(
            "w-full",
            done
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-violet-600 hover:bg-violet-700"
          )}
        >
          {done ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Completed — nice work!
            </>
          ) : (
            <>
              <Sparkle className="mr-2 h-4 w-4" />
              Mark as done
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onGenerateRecipe}
          className="w-full bg-white/70 border-violet-200 hover:bg-white hover:border-violet-300 text-violet-700"
        >
          <ChefHat className="mr-2 h-4 w-4" />
          Generate a recipe for this
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------- Water Tracker ---------- */

function WaterTracker() {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `nutrinani_water_${today}`;
  const goal = 8;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(storageKey) || '0', 10);
    setCount(Number.isFinite(stored) ? stored : 0);
  }, [storageKey]);

  const setTo = (n: number) => {
    const next = Math.max(0, Math.min(goal, n));
    setCount(next);
    localStorage.setItem(storageKey, String(next));
  };

  const pct = Math.round((count / goal) * 100);

  return (
    <Card className="border-2 border-sky-100 bg-gradient-to-br from-sky-50/50 to-cyan-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Droplet className="h-5 w-5 text-sky-600" />
            Water tracker
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-white/60 border-sky-300 text-sky-700">
            {count} / {goal}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          Tap a glass each time you drink — aim for 8 across the day.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: goal }, (_, i) => {
            const filled = i < count;
            return (
              <button
                key={i}
                onClick={() => setTo(filled && i === count - 1 ? i : i + 1)}
                title={`${i + 1} glass${i ? 'es' : ''}`}
                className={cn(
                  "aspect-[3/4] rounded-md border-2 transition-all flex items-end justify-center p-1",
                  filled
                    ? "bg-sky-400 border-sky-500 shadow-inner"
                    : "bg-white border-sky-200 hover:border-sky-400"
                )}
              >
                <Droplet className={cn("h-3 w-3", filled ? "text-white" : "text-sky-300")} fill={filled ? "currentColor" : "none"} />
              </button>
            );
          })}
        </div>
        <Progress value={pct} className="h-1.5" />
        <p className="text-xs text-center text-muted-foreground">
          {count === 0 && "Tap a glass to log your first sip."}
          {count > 0 && count < goal && `${goal - count} more to hit today's goal.`}
          {count >= goal && "🎉 Hydration goal met for today!"}
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------- Today's Plate (Food Groups) ---------- */

const FOOD_GROUPS = [
  { id: 'veg', emoji: '🥬', label: 'Veg', hint: 'A fistful of greens' },
  { id: 'fruit', emoji: '🍎', label: 'Fruit', hint: 'Whole, with skin' },
  { id: 'protein', emoji: '🥚', label: 'Protein', hint: 'Dal, eggs, paneer' },
  { id: 'grain', emoji: '🌾', label: 'Grain', hint: 'Roti, oats, rice' },
  { id: 'dairy', emoji: '🥛', label: 'Dairy', hint: 'Curd, milk, kefir' },
];

function TodaysPlate() {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `nutrinani_plate_${today}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const count = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((count / FOOD_GROUPS.length) * 100);

  return (
    <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Utensils className="h-5 w-5 text-rose-600" />
            Today's plate
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-white/70 border-rose-300 text-rose-700">
            {count} / {FOOD_GROUPS.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          Tick off each food group you've eaten today for a balanced plate.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {FOOD_GROUPS.map((g) => {
            const on = !!checked[g.id];
            return (
              <button
                key={g.id}
                onClick={() => toggle(g.id)}
                title={g.hint}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-0.5 py-2 rounded-xl border-2 transition-all min-w-0 overflow-hidden",
                  on
                    ? "bg-white border-rose-400 shadow-md scale-105"
                    : "bg-white/40 border-rose-100 hover:border-rose-300 opacity-60 hover:opacity-100"
                )}
              >
                <span className={cn("text-2xl transition-transform leading-none", on && "scale-110")}>{g.emoji}</span>
                <span className={cn("text-[10px] font-semibold leading-none text-center whitespace-nowrap", on ? "text-foreground" : "text-muted-foreground")}>
                  {g.label}
                </span>
              </button>
            );
          })}
        </div>
        <Progress value={pct} className="h-1.5" />
        <p className="text-xs text-center text-muted-foreground">
          {count === 0 && "Tap each group you've eaten today."}
          {count > 0 && count < FOOD_GROUPS.length && `${FOOD_GROUPS.length - count} food group${FOOD_GROUPS.length - count === 1 ? '' : 's'} to go.`}
          {count === FOOD_GROUPS.length && "🌟 A perfectly balanced plate today!"}
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------- Profile Completeness ---------- */

function ProfileCompleteness({ profile, onEdit }: { profile: any; onEdit?: () => void }) {
  const fields = ['name', 'dob', 'diet_type', 'allergies', 'diseases', 'activity_level'];
  const filled = fields.filter(f => {
    const v = profile?.[f];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }).length;
  const pct = Math.round((filled / fields.length) * 100);

  if (pct === 100) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-full border border-rose-200 bg-rose-50/60 text-sm">
      <Heart className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
      <span className="text-muted-foreground hidden sm:inline">Profile</span>
      <span className="font-semibold text-rose-700">{pct}%</span>
      <div className="flex-1 min-w-[60px] max-w-[200px]">
        <Progress value={pct} className="h-1.5" />
      </div>
      <button
        onClick={onEdit}
        className="text-xs font-medium text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 whitespace-nowrap"
      >
        Complete <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ---------- Action Tile ---------- */

function ActionTile({
  Icon,
  title,
  desc,
  onClick,
  accentIconBg,
  accentIconText,
  accentBorder,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick?: () => void;
  accentIconBg: string;
  accentIconText: string;
  accentBorder: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left p-3 rounded-xl border border-border/60 bg-white/60 backdrop-blur-sm transition-all",
        "hover:bg-white hover:shadow-md hover:-translate-y-0.5",
        accentBorder
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("p-2 rounded-lg flex-shrink-0", accentIconBg)}>
          <Icon className={cn("h-4 w-4", accentIconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">{title}</div>
          <div className="text-xs text-muted-foreground truncate">{desc}</div>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
    </button>
  );
}

/* ---------- Main Dashboard ---------- */

export default function Dashboard({ onNavigateToSection }: DashboardProps) {
  const { user, isAuthed } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const time = useMemo(() => getTimeContext(), []);
  const dailyTip = useMemo(() => getDailyTip(), []);
  const streak = useStreak(isAuthed);

  const displayName = useMemo(() => {
    return (profile?.name as string) || user?.name || (user?.email ? user.email.split('@')[0] : '') || 'friend';
  }, [profile?.name, user?.name, user?.email]);

  const age = useMemo(() => {
    const dob = profile?.dob as string;
    return dob ? calculateAge(dob) : null;
  }, [profile?.dob]);

  const allergies = (profile?.allergies as string[]) || [];

  const MealIcon = time.mealIcon;
  const TimeIcon = time.Icon;
  const mealIdeas = MEAL_IDEAS[time.ideasKey];

  return (
    <div className="space-y-6">
      {/* Hero / Greeting — inline, not a card */}
      <section className="flex flex-col md:flex-row md:items-start gap-8 pt-1">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <TimeIcon className={`h-4 w-4 ${time.iconColor}`} />
              <span>{time.greeting}</span>
              <span className="opacity-50">·</span>
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {time.greeting}, <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{displayName}</span> <span className="inline-block">👋</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-base">
              {isAuthed
                ? "Here's your nutrition snapshot for today. Small steps, big impact."
                : "Your AI nutrition companion. Sign in to unlock personalized scans, recipes and pantry tracking."}
            </p>
          </div>

          {/* Action tiles below the greeting */}
          {!isAuthed ? (
            <div className="flex flex-wrap gap-2 pt-4">
              <Button onClick={() => navigate('/login')} className="bg-green-600 hover:bg-green-700">
                <LogIn className="mr-2 h-4 w-4" />
                Get started — it's free
              </Button>
              <Button variant="outline" onClick={() => navigate('/login')}>
                I already have an account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
              <ActionTile
                Icon={Scan}
                title="Scan"
                desc="Get a safety verdict"
                accentIconBg="bg-emerald-100"
                accentIconText="text-emerald-700"
                accentBorder="hover:border-emerald-300"
                onClick={() => onNavigateToSection?.('scanner')}
              />
              <ActionTile
                Icon={ChefHat}
                title="Generate"
                desc="Personalized recipe"
                accentIconBg="bg-amber-100"
                accentIconText="text-amber-700"
                accentBorder="hover:border-amber-300"
                onClick={() => onNavigateToSection?.('recipes')}
              />
              <ActionTile
                Icon={Bot}
                title="Ask Nani"
                desc="AI nutrition chat"
                accentIconBg="bg-violet-100"
                accentIconText="text-violet-700"
                accentBorder="hover:border-violet-300"
                onClick={() => onNavigateToSection?.('chat')}
              />
            </div>
          )}
        </div>

        {/* Meal ideas card stack */}
        <div className="md:w-[340px] flex-shrink-0 mt-6 md:mt-12">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <MealIcon className="h-4 w-4" />
            {time.mealLabel}
          </div>
          <MealIdeasStack
            ideas={mealIdeas}
            onSeeMore={() => onNavigateToSection?.('recipes')}
          />
        </div>
      </section>

      {/* Stat pills + Tip on same row — breaks the parallel-pill pattern */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-orange-200">
          <Flame className="h-3.5 w-3.5 text-orange-600" />
          <span className="text-sm font-bold text-orange-900">{isAuthed ? streak.count : '—'}</span>
          <span className="text-xs text-muted-foreground">streak</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-purple-200">
          <Star className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-sm font-bold text-purple-900">{isAuthed ? streak.best : '—'}</span>
          <span className="text-xs text-muted-foreground">best</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-blue-200">
          <Shield className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-sm font-bold text-blue-900">{allergies.length}</span>
          <span className="text-xs text-muted-foreground">allergies</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-rose-200">
          <Heart className="h-3.5 w-3.5 text-rose-600" />
          <span className="text-sm font-bold text-rose-900">{age ?? '—'}</span>
          <span className="text-xs text-muted-foreground">{age ? 'yrs' : 'add age'}</span>
        </div>

        {/* Inline tip — fills remaining space */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-200/80 bg-yellow-50/60 flex-1 min-w-[260px]">
          <Lightbulb className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-700 flex-shrink-0">Tip</span>
          <p className="text-xs text-foreground/90 leading-snug truncate flex-1">
            {dailyTip.tip}
          </p>
        </div>
      </div>

      {/* Pantry snapshot / sign-in CTA — full width compact */}
      {isAuthed ? (
        <InventorySnapshot onNavigate={onNavigateToSection} />
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-green-200 bg-green-50/40">
          <Package className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">
            Sign in to track your pantry, get expiry alerts and turn leftovers into recipes.
          </p>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => navigate('/login')}>
            <LogIn className="mr-1.5 h-3.5 w-3.5" />
            Sign in
          </Button>
        </div>
      )}

      {/* Interactive trackers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DailyChallengeCard onGenerateRecipe={() => onNavigateToSection?.('recipes')} />
        <WaterTracker />
        <TodaysPlate />
      </div>

      {/* Profile completeness (authed + incomplete only) */}
      {isAuthed && profile && (
        <ProfileCompleteness profile={profile} onEdit={() => onNavigateToSection?.('editProfile')} />
      )}

      {/* What is NutriNani — only for unauthed visitors */}
      {!isAuthed && (
        <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50/50 to-emerald-50/50">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl">What is NutriNani?</CardTitle>
            </div>
            <CardDescription className="text-base">
              Traditional nutrition wisdom meets modern AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center space-y-2 p-4 rounded-lg bg-white/60">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Scan className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold">Smart scanning</h3>
                <p className="text-sm text-muted-foreground">Scan labels, get instant safety verdicts</p>
              </div>
              <div className="text-center space-y-2 p-4 rounded-lg bg-white/60">
                <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <ChefHat className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold">Recipe magic</h3>
                <p className="text-sm text-muted-foreground">Personalized to your preferences</p>
              </div>
              <div className="text-center space-y-2 p-4 rounded-lg bg-white/60">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Bot className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold">Nani Voice</h3>
                <p className="text-sm text-muted-foreground">Chat with your AI nutrition grandma</p>
              </div>
              <div className="text-center space-y-2 p-4 rounded-lg bg-white/60">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold">Smart pantry</h3>
                <p className="text-sm text-muted-foreground">Track stock, never waste again</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
