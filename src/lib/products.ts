import p1 from "@/assets/product-1.jpg";
import p2 from "@/assets/product-2.jpg";
import p3 from "@/assets/product-3.jpg";
import p4 from "@/assets/product-4.jpg";
import p5 from "@/assets/product-5.jpg";
import p6 from "@/assets/product-6.jpg";
import p7 from "@/assets/product-7.jpg";
import p8 from "@/assets/product-8.jpg";

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

export const products: Product[] = [
  {
    id: "1",
    name: "Silk Straight Goddess",
    type: "Wigs",
    price: 180000,
    originalPrice: 225000,
    image: p1,
    thumbnails: [p1, p5, p7],
    stock: 8,
    length: '22"',
    texture: "Straight",
    hairType: "100% Virgin",
    description:
      "Sleek, jet-black virgin hair with a natural shine and effortless flow. Soft, tangle-free, and ready to wear straight out of the box.",
  },
  {
    id: "2",
    name: "Brazilian Curl Bundle",
    type: "Bundles",
    price: 95000,
    originalPrice: 120000,
    image: p2,
    thumbnails: [p2, p7, p1],
    stock: 12,
    length: '18"',
    texture: "Curly",
    hairType: "Remy",
    description:
      "Lush curls with rich body and bounce. Premium remy hair that holds curl beautifully wash after wash.",
  },
  {
    id: "3",
    name: "Honey Blonde Wave",
    type: "Bundles",
    price: 135000,
    originalPrice: 160000,
    image: p3,
    thumbnails: [p3, p2],
    stock: 3,
    length: '24"',
    texture: "Wavy",
    hairType: "100% Virgin",
    description:
      "Warm honey blonde with subtle highlights. Soft waves that move and shine in every light.",
  },
  {
    id: "4",
    name: "Rainbow Braiding Pack",
    type: "Braiding",
    price: 28000,
    originalPrice: 35000,
    image: p4,
    thumbnails: [p4],
    stock: 24,
    length: '26"',
    texture: "Pre-stretched",
    hairType: "Synthetic Premium",
    description:
      "A curated mix of colors for vibrant, statement braids. Lightweight, soft, and easy to install.",
  },
  {
    id: "5",
    name: "Classic Bob Wig",
    type: "Wigs",
    price: 120000,
    originalPrice: 150000,
    image: p5,
    thumbnails: [p5, p1],
    stock: 6,
    length: '12"',
    texture: "Straight",
    hairType: "100% Virgin",
    description:
      "A timeless bob with a sharp line and silky finish. Effortlessly chic for any occasion.",
  },
  {
    id: "6",
    name: "Gold Hair Accessory Set",
    type: "Accessories",
    price: 18000,
    originalPrice: 25000,
    image: p6,
    thumbnails: [p6],
    stock: 15,
    length: "N/A",
    texture: "Metal & Silk",
    hairType: "Accessory",
    description:
      "Hand-finished gold clips and a soft silk scarf — the perfect finishing touch to any look.",
  },
  {
    id: "7",
    name: "Deep Wave Luxe",
    type: "Bundles",
    price: 145000,
    originalPrice: 180000,
    image: p7,
    thumbnails: [p7, p2],
    stock: 9,
    length: '20"',
    texture: "Deep Wave",
    hairType: "100% Virgin",
    description:
      "Rich, glossy deep waves that fall beautifully. Dense from root to tip with zero shedding.",
  },
  {
    id: "8",
    name: "Burgundy Curl Statement",
    type: "Wigs",
    price: 165000,
    originalPrice: 200000,
    image: p8,
    thumbnails: [p8, p2],
    stock: 2,
    length: '14"',
    texture: "Curly",
    hairType: "Remy Colored",
    description:
      "A bold burgundy crown of curls. Pre-styled, ready-to-wear, made for queens who turn heads.",
  },
];

export const formatNaira = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
