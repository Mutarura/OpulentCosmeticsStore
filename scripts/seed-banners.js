
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually since we don't want to install dotenv just for this
const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const banners = [
  // HERS SECTION
  {
    image_path: 'https://images.unsplash.com/photo-1570172619643-c3969707bbb7?q=80&w=1600&auto=format&fit=crop',
    headline: 'Radiant Beauty',
    subtext: 'Discover our premium collection for her.',
    cta_text: 'Shop Now',
    cta_link: '/shop/women',
    section: 'hers',
    active: true,
    sort_order: 1
  },
  {
    image_path: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1600&auto=format&fit=crop',
    headline: 'Luxury Textures',
    subtext: 'Experience the finest ingredients.',
    cta_text: 'Explore',
    cta_link: '/shop/women',
    section: 'hers',
    active: true,
    sort_order: 2
  },
  // HIS SECTION
  {
    image_path: 'https://images.unsplash.com/photo-1621600411688-4be93cd68504?q=80&w=1600&auto=format&fit=crop',
    headline: 'Refined Grooming',
    subtext: 'Elevate your daily routine.',
    cta_text: 'Shop Men',
    cta_link: '/shop/men',
    section: 'his',
    active: true,
    sort_order: 1
  },
  {
    image_path: 'https://images.unsplash.com/photo-1616169053896-1c447602330e?q=80&w=1600&auto=format&fit=crop',
    headline: 'Minimalist Care',
    subtext: 'Simple, effective, premium.',
    cta_text: 'Discover',
    cta_link: '/shop/men',
    section: 'his',
    active: true,
    sort_order: 2
  }
];

async function seedBanners() {
  console.log('Clearing existing banners...');
  const { error: deleteError } = await supabase
    .from('banners')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Error clearing banners:', deleteError);
    return;
  }

  console.log('Inserting new banners...');
  const { error: insertError } = await supabase
    .from('banners')
    .insert(banners);

  if (insertError) {
    console.error('Error inserting banners:', insertError);
  } else {
    console.log('Successfully created 4 new banners (2 His, 2 Hers)!');
  }
}

seedBanners();
