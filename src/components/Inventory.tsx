import { useState } from "react";
import { Package, Plus, Search, AlertTriangle, Trash2, Edit2, ChefHat, Calendar, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePantryItems, useAddPantryItem, useUpdatePantryItem, useDeletePantryItem } from "@/hooks/useApi";
import type { PantryItem } from "@/types";

interface InventoryProps {
  onNavigateToRecipes?: () => void;
}

export const Inventory = ({ onNavigateToRecipes }: InventoryProps) => {
  const { data: pantryItems, isLoading } = usePantryItems();
  const addItem = useAddPantryItem();
  const updateItem = useUpdatePantryItem();
  const deleteItem = useDeletePantryItem();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "",
    unit: "g",
    category: "Other",
    expiryDate: "",
  });

  const categories = ["Grains", "Legumes", "Flour", "Vegetables", "Spices", "Dairy", "Other"];
  const units = ["g", "kg", "ml", "L", "pc", "cup", "tbsp", "tsp"];

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 5 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate).getTime() < Date.now();
  };

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const filteredItems = pantryItems?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const matchesExpiring = !showExpiringOnly || isExpiringSoon(item.expiryDate) || isExpired(item.expiryDate);
    return matchesSearch && matchesCategory && matchesExpiring;
  });

  const expiringItems = pantryItems?.filter((item) => isExpiringSoon(item.expiryDate) || isExpired(item.expiryDate)) || [];

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    addItem.mutate({
      name: newItem.name,
      quantity: newItem.quantity ? parseFloat(newItem.quantity) : undefined,
      unit: newItem.unit,
      category: newItem.category,
      expiryDate: newItem.expiryDate || undefined,
    });
    setNewItem({ name: "", quantity: "", unit: "g", category: "Other", expiryDate: "" });
    setIsAddDialogOpen(false);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateItem.mutate(editingItem);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    deleteItem.mutate(id);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            My Pantry
          </h2>
          <p className="text-muted-foreground mt-1">Manage your ingredients and track expiry dates</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Pantry Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., Oats, Rice, Turmeric"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={newItem.unit} onValueChange={(value) => setNewItem({ ...newItem, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={newItem.expiryDate}
                  onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddItem} disabled={!newItem.name.trim() || addItem.isPending}>
                {addItem.isPending ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Pantry List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search pantry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={showExpiringOnly ? "default" : "outline"}
                  onClick={() => setShowExpiringOnly(!showExpiringOnly)}
                  className="gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Expiring Soon
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredItems?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No pantry items yet</p>
                  <p className="text-sm">Add your first ingredient to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems?.map((item) => {
                    const days = getDaysUntilExpiry(item.expiryDate);
                    const expired = isExpired(item.expiryDate);
                    const expiring = isExpiringSoon(item.expiryDate);

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${
                          expired ? "bg-destructive/10 border-destructive/30" : 
                          expiring ? "bg-warning/10 border-warning/30" : 
                          "bg-card border-border"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-foreground">{item.name}</h4>
                            {item.category && (
                              <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                            )}
                            {expired && (
                              <Badge variant="destructive" className="text-xs">Expired</Badge>
                            )}
                            {expiring && !expired && (
                              <Badge variant="outline" className="text-xs border-warning text-warning">
                                {days} days left
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            {item.quantity && (
                              <span>{item.quantity} {item.unit}</span>
                            )}
                            {item.expiryDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Item</DialogTitle>
                              </DialogHeader>
                              {editingItem && (
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                      value={editingItem.name}
                                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Quantity</Label>
                                      <Input
                                        type="number"
                                        value={editingItem.quantity || ""}
                                        onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || undefined })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Unit</Label>
                                      <Select
                                        value={editingItem.unit || "g"}
                                        onValueChange={(value) => setEditingItem({ ...editingItem, unit: value })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {units.map((unit) => (
                                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
                                  {updateItem.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Insights Panel */}
        <div className="space-y-4">
          {/* Expiring Soon Card */}
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items expiring soon</p>
              ) : (
                <div className="space-y-2">
                  {expiringItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className={isExpired(item.expiryDate) ? "text-destructive" : "text-warning"}>
                        {isExpired(item.expiryDate) ? "Expired" : `${getDaysUntilExpiry(item.expiryDate)}d left`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full gap-2" 
                variant="outline"
                onClick={onNavigateToRecipes}
              >
                <ChefHat className="w-4 h-4" />
                Cook Using Pantry
              </Button>
              {expiringItems.length > 0 && (
                <Button className="w-full gap-2" variant="secondary">
                  <AlertTriangle className="w-4 h-4" />
                  Rescue Recipes
                  <Badge variant="outline" className="ml-auto">{expiringItems.length}</Badge>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pantry Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg bg-primary/10">
                  <p className="text-2xl font-bold text-primary">{pantryItems?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10">
                  <p className="text-2xl font-bold text-warning">{expiringItems.length}</p>
                  <p className="text-xs text-muted-foreground">Expiring</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-muted-foreground">Coming Soon</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Barcode scanning for quick add</p>
              <p>• Smart expiry reminders</p>
              <p>• Meal planning integration</p>
              <p>• Receipt scanning</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
