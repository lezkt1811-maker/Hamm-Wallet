/*
  seed.js — adds a few demo products the FIRST time the site is opened,
  so the Shop isn't empty and you can see the whole flow working
  immediately. Safe to delete real products later from Admin > Products.
  Never overwrites products you've already added/edited.
*/
(function seedDemoProducts() {
  const existing = STORE.getProducts();
  if (existing.length > 0) return; // never re-seed once real data exists

  const demo = [
    {
      name: 'Y2K Star Burst',
      description: 'Chrome pixel-star die-cut sticker with rainbow gradient outline. Original design.',
      price: 3.50, cost: 0.65, qtyOnHand: 120, qtySold: 0,
      size: '3in', type: 'die-cut', sku: 'ORIG-STAR-001',
      tags: ['y2k', 'stars', 'original'], collection: 'Y2K Classics',
      designType: 'original', bestSeller: true, limitedDrop: false,
      image: '', stripePaymentLink: '',
    },
    {
      name: 'Retro Flip Phone',
      description: 'Glossy holographic flip-phone sticker for the nostalgia era. Original design.',
      price: 4.00, cost: 0.80, qtyOnHand: 8, qtySold: 0,
      size: '3in', type: 'holographic', sku: 'ORIG-PHONE-002',
      tags: ['y2k', 'tech', 'original'], collection: 'Y2K Classics',
      designType: 'original', bestSeller: false, limitedDrop: true,
      image: '', stripePaymentLink: '',
    },
    {
      name: 'Rainbow Cyber Heart',
      description: 'Glitter-finish heart with chrome outline. Original parody-inspired doodle style.',
      price: 3.00, cost: 0.55, qtyOnHand: 0, qtySold: 4,
      size: '2in', type: 'glitter', sku: 'PAR-HEART-003',
      tags: ['rainbow', 'glitter'], collection: 'Rainbow Drop',
      designType: 'parody-inspired', bestSeller: false, limitedDrop: false,
      image: '', stripePaymentLink: '',
    },
  ];

  demo.forEach(p => STORE.saveProduct(p));
})();
