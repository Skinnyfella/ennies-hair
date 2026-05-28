// Product type used throughout the app. Data lives in Supabase (table: products).
export type Category = "Wigs" | "Bundles" | "Braiding" | "Accessories";

export interface Product {
  id: string;
  name: string;
  type: Category;
  price: number;
  originalPrice: number;
  image: string;
  thumbnails: string[];
  stock: number;
  length: string;
  texture: string;
  hairType: string;
  description: string;
}

// Map a DB row (snake_case) to the app Product shape (camelCase).
export function dbToProduct(r: any): Product {
  return {
    id: r.id,
    name: r.name,
    type: r.type as Category,
    price: Number(r.price),
    originalPrice: Number(r.original_price),
    image: r.image,
    thumbnails: r.thumbnails ?? [],
    stock: r.stock,
    length: r.length,
    texture: r.texture,
    hairType: r.hair_type,
    description: r.description,
  };
}

export function productToDb(p: Omit<Product, "id"> | Partial<Product>) {
  const out: Record<string, unknown> = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.type !== undefined) out.type = p.type;
  if (p.price !== undefined) out.price = p.price;
  if ((p as any).originalPrice !== undefined) out.original_price = (p as any).originalPrice;
  if (p.image !== undefined) out.image = p.image;
  if (p.thumbnails !== undefined) out.thumbnails = p.thumbnails;
  if (p.stock !== undefined) out.stock = p.stock;
  if (p.length !== undefined) out.length = p.length;
  if (p.texture !== undefined) out.texture = p.texture;
  if ((p as any).hairType !== undefined) out.hair_type = (p as any).hairType;
  if (p.description !== undefined) out.description = p.description;
  return out;
}

export const formatNaira = (n: number) =>
  "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });
