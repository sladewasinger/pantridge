interface LinkedData {
  foods: { id: string }[];
  stock: { id: string; foodId: string }[];
  shopping: { id: string; foodId?: string }[];
}
export function hasValidLinks(data: LinkedData): boolean {
  const foods = new Set(data.foods.map((food) => food.id));
  return (
    [data.foods, data.stock, data.shopping].every(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
    ) &&
    data.stock.every((stock) => foods.has(stock.foodId)) &&
    data.shopping.every((item) => !item.foodId || foods.has(item.foodId))
  );
}
