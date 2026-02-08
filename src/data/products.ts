export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'Her' | 'Him';
  image: string;
  rating: number;
  tag?: 'New' | 'Bestseller' | 'Out of Stock';
}

export const products: Product[] = [
  // For Her
  {
    id: 'h1',
    name: 'Velvet Rose Lipstick',
    price: 3500,
    description: 'A rich, creamy lipstick with a satin finish that lasts all day.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    tag: 'Bestseller'
  },
  {
    id: 'h2',
    name: 'Radiance Serum',
    price: 5200,
    description: 'Brightening serum infused with Vitamin C for a glowing complexion.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    tag: 'New'
  },
  {
    id: 'h3',
    name: 'Floral Essence Perfume',
    price: 9500,
    description: 'A delicate blend of jasmine, rose, and vanilla.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop',
    rating: 4.7
  },
  {
    id: 'h4',
    name: 'Hydrating Night Cream',
    price: 4500,
    description: 'Deeply moisturizing night cream to repair skin while you sleep.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    tag: 'Out of Stock'
  },
  {
    id: 'h5',
    name: 'Silk Foundation',
    price: 4800,
    description: 'Lightweight foundation with buildable coverage and a natural finish.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?q=80&w=800&auto=format&fit=crop',
    rating: 4.5
  },
  {
    id: 'h6',
    name: 'Rose Gold Highlighter',
    price: 3200,
    description: 'A silky powder highlighter for a natural, luminous glow.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=800&auto=format&fit=crop',
    rating: 4.7
  },
  {
    id: 'h7',
    name: 'Volumizing Mascara',
    price: 2500,
    description: 'Intense black mascara for dramatic volume and length.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?q=80&w=800&auto=format&fit=crop',
    rating: 4.6
  },
  {
    id: 'h8',
    name: 'Peptide Eye Cream',
    price: 4100,
    description: 'Reduces puffiness and dark circles for a refreshed look.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?q=80&w=800&auto=format&fit=crop',
    rating: 4.8
  },
  {
    id: 'h9',
    name: 'Matte Liquid Lipstick',
    price: 2900,
    description: 'Long-wearing matte liquid lipstick in a stunning berry shade.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=800&auto=format&fit=crop',
    rating: 4.5
  },
  {
    id: 'h10',
    name: 'Lavender Bath Salts',
    price: 1800,
    description: 'Relaxing bath salts with dried lavender buds and essential oils.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    tag: 'New'
  },
  {
    id: 'h11',
    name: 'Sun Defense SPF 50',
    price: 3800,
    description: 'Lightweight sunscreen that protects without leaving a white cast.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1556228720-19875143a598?q=80&w=800&auto=format&fit=crop',
    rating: 4.7
  },
  {
    id: 'h12',
    name: 'Vitamin C Clay Mask',
    price: 3400,
    description: 'Detoxifying clay mask that brightens and purifies pores.',
    category: 'Her',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdd403348?q=80&w=800&auto=format&fit=crop',
    rating: 4.6
  },

  // For Him
  {
    id: 'm1',
    name: 'Charcoal Face Wash',
    price: 2800,
    description: 'Deep cleansing face wash with activated charcoal to remove impurities.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfbc8?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    tag: 'Bestseller'
  },
  {
    id: 'm2',
    name: 'Cedarwood Beard Oil',
    price: 2200,
    description: 'Nourishing beard oil with a masculine cedarwood scent.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1621607512288-6028eda4279d?q=80&w=800&auto=format&fit=crop',
    rating: 4.8
  },
  {
    id: 'm3',
    name: 'Daily Moisturizer for Men',
    price: 3600,
    description: 'Lightweight, non-greasy moisturizer with SPF 15.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    tag: 'New'
  },
  {
    id: 'm4',
    name: 'Ocean Breeze Cologne',
    price: 8500,
    description: 'Fresh and invigorating cologne with notes of sea salt and citrus.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d60f?q=80&w=800&auto=format&fit=crop',
    rating: 4.9
  },
  {
    id: 'm5',
    name: 'Shaving Cream Kit',
    price: 5200,
    description: 'Luxury shaving kit including brush, cream, and razor.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1626108860228-444743f55458?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    tag: 'Out of Stock'
  },
  {
    id: 'm6',
    name: 'Matte Clay Pomade',
    price: 2100,
    description: 'Strong hold hair clay with a matte finish for textured styles.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1593487424699-b1d378034456?q=80&w=800&auto=format&fit=crop',
    rating: 4.7
  },
  {
    id: 'm7',
    name: 'Energizing Body Wash',
    price: 1800,
    description: 'Refresh your senses with this eucalyptus and mint body wash.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfbc8?q=80&w=800&auto=format&fit=crop',
    rating: 4.6
  },
  {
    id: 'm8',
    name: 'Anti-Fatigue Eye Roll-On',
    price: 2900,
    description: 'Instantly cools and awakens tired eyes, reducing puffiness.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    tag: 'Bestseller'
  },
  {
    id: 'm9',
    name: 'Sandalwood Aftershave Balm',
    price: 3100,
    description: 'Soothing balm that calms irritation and hydrates after shaving.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1621607512288-6028eda4279d?q=80&w=800&auto=format&fit=crop',
    rating: 4.9
  },
  {
    id: 'm10',
    name: 'Exfoliating Face Scrub',
    price: 2400,
    description: 'Removes dead skin cells and prevents ingrown hairs.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1556228720-19875143a598?q=80&w=800&auto=format&fit=crop',
    rating: 4.7
  },
  {
    id: 'm11',
    name: 'Daily Vitamin Shampoo',
    price: 1900,
    description: 'Strengthening shampoo for healthy, thicker-looking hair.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=800&auto=format&fit=crop',
    rating: 4.5
  },
  {
    id: 'm12',
    name: 'Sport Deodorant Stick',
    price: 1500,
    description: 'Long-lasting odor protection for active lifestyles.',
    category: 'Him',
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d60f?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    tag: 'New'
  },
];
