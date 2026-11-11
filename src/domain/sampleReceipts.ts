import { LineItem, Adjustment } from './splitEngine';

export interface SampleReceipt {
  id: string;
  merchantName: string;
  category: string;
  location: string;
  date: string;
  totalPaise: number;
  items: LineItem[];
  adjustments: Adjustment[];
  warnings?: string[];
  notes: string;
}

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'receipt_mountain_cafe',
    merchantName: 'The Mountain Cafe',
    category: 'Dinner at Cafe',
    location: 'Manali, HP',
    date: '2026-11-11',
    totalPaise: 135450, // ₹1,354.50 exact match to SplitSnap showcase!
    notes: 'Official SplitSnap Showcase Receipt: Paneer Butter Masala, Dal Tadka, Garlic Naan, Jeera Rice, Lemon Soda with 5% GST.',
    items: [
      {
        id: 'it_mc_1',
        description: 'Paneer Butter Masala',
        quantity: 1,
        unitPricePaise: 42000,
        lineTotalPaise: 42000,
        taxIncluded: false,
        confidence: 0.98,
      },
      {
        id: 'it_mc_2',
        description: 'Dal Tadka',
        quantity: 1,
        unitPricePaise: 28000,
        lineTotalPaise: 28000,
        taxIncluded: false,
        confidence: 0.96,
      },
      {
        id: 'it_mc_3',
        description: 'Garlic Naan (2)',
        quantity: 2,
        unitPricePaise: 7000,
        lineTotalPaise: 14000,
        taxIncluded: false,
        confidence: 0.95,
      },
      {
        id: 'it_mc_4',
        description: 'Jeera Rice',
        quantity: 1,
        unitPricePaise: 18000,
        lineTotalPaise: 18000,
        taxIncluded: false,
        confidence: 0.97,
      },
      {
        id: 'it_mc_5',
        description: 'Lemon Soda (3)',
        quantity: 3,
        unitPricePaise: 9000,
        lineTotalPaise: 27000,
        taxIncluded: false,
        confidence: 0.99,
      },
    ],
    adjustments: [
      {
        id: 'adj_mc_cgst',
        type: 'tax',
        description: 'CGST (2.5%)',
        amountPaise: 3225,
        policy: 'proportional_subtotal',
        confidence: 0.96,
      },
      {
        id: 'adj_mc_sgst',
        type: 'tax',
        description: 'SGST (2.5%)',
        amountPaise: 3225,
        policy: 'proportional_subtotal',
        confidence: 0.96,
      },
    ],
    warnings: [],
  },
  {
    id: 'receipt_toit_bangalore',
    merchantName: 'The Bangalore Brew Works',
    category: 'Dinner & Craft Drinks',
    location: 'Indiranagar, Bengaluru',
    date: '2026-11-10',
    totalPaise: 129900,
    notes: 'PRD Page 5 reference: Paneer tikka, Biryani, Water with proportional tax, service charge, and tip.',
    items: [
      {
        id: 'item_bbw_1',
        description: 'Tandoori Paneer Tikka',
        quantity: 1,
        unitPricePaise: 45000,
        lineTotalPaise: 45000,
        taxIncluded: false,
        confidence: 0.96,
      },
      {
        id: 'item_bbw_2',
        description: 'Awadhi Dum Biryani (Chicken)',
        quantity: 1,
        unitPricePaise: 60000,
        lineTotalPaise: 60000,
        taxIncluded: false,
        confidence: 0.94,
      },
      {
        id: 'item_bbw_3',
        description: 'Himalayan Mineral Water (750ml)',
        quantity: 1,
        unitPricePaise: 4000,
        lineTotalPaise: 4000,
        taxIncluded: false,
        confidence: 0.98,
      },
    ],
    adjustments: [
      {
        id: 'adj_bbw_1',
        type: 'tax',
        description: 'GST (2.5% CGST + 2.5% SGST)',
        amountPaise: 5450,
        policy: 'proportional_subtotal',
        confidence: 0.91,
      },
      {
        id: 'adj_bbw_2',
        type: 'service_charge',
        description: 'Service Charge (5%)',
        amountPaise: 5450,
        policy: 'proportional_subtotal',
        confidence: 0.88,
      },
      {
        id: 'adj_bbw_3',
        type: 'tip',
        description: 'Staff Gratitude Tip',
        amountPaise: 10000,
        policy: 'proportional_subtotal',
        confidence: 0.95,
      },
    ],
    warnings: [],
  },
  {
    id: 'receipt_bawarchi_hyderabad',
    merchantName: 'Bawarchi Restaurant',
    category: 'Group Feast',
    location: 'RTC X Roads, Hyderabad',
    date: '2026-11-09',
    totalPaise: 159600,
    notes: 'Classic Hyderabadi dinner with shared biryanis, starters, and breads.',
    items: [
      {
        id: 'item_bawarchi_1',
        description: 'Special Mutton Biryani',
        quantity: 2,
        unitPricePaise: 38000,
        lineTotalPaise: 76000,
        taxIncluded: false,
        confidence: 0.95,
      },
      {
        id: 'item_bawarchi_2',
        description: 'Chicken 65 (Crispy Masala)',
        quantity: 1,
        unitPricePaise: 34000,
        lineTotalPaise: 34000,
        taxIncluded: false,
        confidence: 0.93,
      },
      {
        id: 'item_bawarchi_3',
        description: 'Mirchi Ka Salan (Side Curry)',
        quantity: 1,
        unitPricePaise: 12000,
        lineTotalPaise: 12000,
        taxIncluded: false,
        confidence: 0.92,
      },
      {
        id: 'item_bawarchi_4',
        description: 'Garlic Butter Naan',
        quantity: 4,
        unitPricePaise: 4500,
        lineTotalPaise: 18000,
        taxIncluded: false,
        confidence: 0.97,
      },
      {
        id: 'item_bawarchi_5',
        description: 'Thums Up (Can 330ml)',
        quantity: 2,
        unitPricePaise: 6000,
        lineTotalPaise: 12000,
        taxIncluded: false,
        confidence: 0.99,
      },
    ],
    adjustments: [
      {
        id: 'adj_bawarchi_1',
        type: 'tax',
        description: 'Restaurant GST (5%)',
        amountPaise: 7600,
        policy: 'proportional_subtotal',
        confidence: 0.93,
      },
    ],
    warnings: [],
  },
];
