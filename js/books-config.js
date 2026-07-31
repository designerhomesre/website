/**
 * DESIGNER HOMES — BOOK STOREFRONT CONFIGURATION
 * =============================================================================
 * SINGLE SOURCE OF TRUTH for the memoir & workbook storefront.
 *
 * This file is loaded BOTH in the browser (storefront/admin) AND on the server
 * (Netlify functions). The server re-reads prices and entitlements from here so
 * that totals and digital-bonus rules are ALWAYS verified server-side and are
 * never trusted from the browser.
 *
 * ⚠️ EDIT ONLY THIS FILE to change products, prices, entitlements, weights,
 *    shipping settings, and copy. Do not duplicate these values in other files.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER POLICY
 *   Anything marked  __PLACEHOLDER__  or with value null / "TBD" is intentionally
 *   left for you (the owner) to fill in. Products with `published: false` OR a
 *   null `priceCents` cannot be purchased — the storefront shows "Pricing coming
 *   soon" and disables checkout. Flip `published: true` after you set a real
 *   price, cover image, and description.
 * ============================================================================
 */
(function (root, factory) {
  var cfg = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = cfg; }
  if (typeof window !== 'undefined') { window.BOOKS_CONFIG = cfg; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ===========================================================================
  // STORE-WIDE SETTINGS  (editable)
  // ===========================================================================
  var store = {
    currency: 'usd',
    // Master switch. Keep false until real prices/covers/descriptions are set.
    storeLive: false,

    // The exact processing/shipping language required. DO NOT imply delivery in 48h.
    processingNotice:
      'Orders are processed and shipped within 48 hours of purchase. Delivery ' +
      'time begins after the shipping carrier accepts the package and varies ' +
      'based on destination and shipping service.',

    // Shipping (USPS Media Mail–first, Pirate Ship fulfillment).
    shipping: {
      defaultServiceCode: 'usps_media_mail',
      services: [
        { code: 'usps_media_mail',      label: 'USPS Media Mail' },
        { code: 'usps_ground_advantage', label: 'USPS Ground Advantage' },
        { code: 'usps_priority',        label: 'USPS Priority Mail' },
        { code: 'ups',                  label: 'UPS' },
        { code: 'other',                label: 'Other' }
      ],
      // Flat domestic rate charged at checkout, in cents. __PLACEHOLDER__ — set real rate.
      flatRateCents: null,          // e.g. 499 for $4.99
      freeShippingThresholdCents: null, // e.g. 5000 for free shipping over $50 (null = disabled)
      allowedRegions: ['US'],       // ISO country codes eligible for checkout
      digitalOnlyShippingCents: 0   // digital-only orders never pay shipping
    },

    // Low-inventory threshold used for "Only N left" badges.
    lowInventoryThreshold: 5,

    // Support contact shown across the storefront / emails.
    support: {
      email: 'info@designerhomesre.com',
      fromEmail: 'info@designerhomesre.com',
      phone: '(973) 725-9580',
      businessName: 'Designer Homes Real Estate Services'
    }
  };

  // ===========================================================================
  // DIGITAL FILES  (private storage — never public URLs)
  //   `storageKey` is the object path inside the PRIVATE Supabase Storage bucket.
  //   The server resolves these to time-limited signed URLs ONLY for buyers whose
  //   order grants the matching entitlement. Filenames here are placeholders.
  // ===========================================================================
  var digitalFiles = {
    MEMOIR_EBOOK: {
      id: 'MEMOIR_EBOOK',
      label: 'Memoir — e-book edition',
      isbn: '979-8-9970832-2-9',
      bucket: 'book-digital',           // private bucket (see migration)
      storageKey: 'memoir-ebook.pdf',   // __PLACEHOLDER__ upload real file, keep private
      downloadName: 'Memoir-eBook.pdf'  // __PLACEHOLDER__ final filename buyer sees
    },
    WORKBOOK_PDF: {
      id: 'WORKBOOK_PDF',
      label: 'Companion Workbook — fillable PDF',
      isbn: '979-8-9970832-5-0',
      bucket: 'book-digital',
      storageKey: 'workbook-fillable.pdf', // __PLACEHOLDER__ upload real fillable PDF
      downloadName: 'Companion-Workbook-Fillable.pdf'
    }
  };

  // ===========================================================================
  // PRODUCTS  (editable)
  //   priceCents:  null until you set a real price (blocks purchase).
  //   published:   false until ready (blocks purchase & hides buy button state).
  //   entitlements: which DIGITAL bonuses this purchase grants. CONFIGURABLE —
  //                 change these booleans to change who gets the e-book / PDF.
  //   physical:    true if a physical item must be packed & shipped.
  //   weightOz / dimsIn: per-product package weight & dimensions for shipping.
  // ===========================================================================
  var products = [
    {
      id: 'memoir-paperback',
      sku: 'MEM-PB',
      name: 'Pride, Property & Power',
      format: 'Paperback',
      shortName: 'Memoir — Paperback',
      priceCents: 2500,
      published: true,
      physical: true,
      featured: false,
      coverImage: '/images/books/pride-property-power-memoir-cover.jpg',
      coverAlt: 'Front cover of Pride, Property & Power',
      shortDescription: 'A memoir and blueprint for building beyond survival.',
      includes: ['Paperback memoir'],
      entitlements: { ebook: false, workbookPdf: false }, // configurable
      isbn: '979-8-9970832-0-5',
      pageCount: null,
      dimensions: 'TBD',
      // Shipping
      weightOz: null,                   // __PLACEHOLDER__ packaged weight in ounces
      dimsIn: { l: null, w: null, h: null }, // __PLACEHOLDER__ inches
      // Inventory
      inventory: null,                  // __PLACEHOLDER__ set quantity on hand
      allowBackorder: false,
      soldOut: false
    },
    {
      id: 'memoir-hardcover',
      sku: 'MEM-HC',
      name: 'Pride, Property & Power',
      format: 'Hardcover',
      shortName: 'Memoir — Hardcover',
      priceCents: 4000,
      published: true,
      physical: true,
      featured: false,
      coverImage: '/images/books/pride-property-power-memoir-cover.jpg',
      coverAlt: 'Front cover of Pride, Property & Power',
      shortDescription: 'A hardcover edition of the memoir and blueprint for building beyond survival.',
      includes: [
        'Hardcover memoir',
        'Complimentary e-book edition of the memoir',
        'Fillable PDF copy of the companion workbook'
      ],
      entitlements: { ebook: true, workbookPdf: true }, // hardcover grants both bonuses
      isbn: '979-8-9970832-1-2',
      pageCount: null,
      dimensions: 'TBD',
      weightOz: null,
      dimsIn: { l: null, w: null, h: null },
      inventory: null,
      allowBackorder: false,
      soldOut: false
    },
    {
      id: 'workbook',
      sku: 'WKB',
      name: 'Pride, Property & Power Workbook',
      format: 'Physical Workbook',
      shortName: 'Companion Workbook',
      priceCents: 2000,
      published: true,
      physical: true,
      featured: false,
      coverImage: '/images/books/pride-property-power-workbook-cover.png',
      coverAlt: 'Front cover of the Pride, Property & Power companion workbook',
      shortDescription: '42 worksheets to build credit, ownership, and generational wealth.',
      includes: ['Physical companion workbook'],
      entitlements: { ebook: false, workbookPdf: false }, // configurable
      isbn: '979-8-9970832-4-3',
      pageCount: null,
      dimensions: 'TBD',
      weightOz: null,
      dimsIn: { l: null, w: null, h: null },
      inventory: null,
      allowBackorder: false,
      soldOut: false
    },
    {
      id: 'combo',
      sku: 'COMBO',
      name: 'Pride, Property & Power Paperback + Workbook Bundle',
      format: 'Combo Package',
      shortName: 'Memoir & Workbook Combo',
      priceCents: 4000,
      published: true,
      physical: true,
      featured: true,                   // recommended offer
      badge: 'Best Value',
      coverImage: '/images/books/combo-cover.jpg',
      coverAlt: 'Pride, Property & Power paperback and companion workbook shown side by side',
      shortDescription: 'Bundle includes one paperback memoir and one physical workbook.',
      includes: [
        'One paperback memoir',
        'One physical companion workbook',
        'Fillable PDF copy of the workbook',
        'Complimentary e-book edition of the memoir'
      ],
      entitlements: { ebook: true, workbookPdf: true }, // combo grants both bonuses
      // Combo ships two physical items; weight is combined.
      containsPhysical: ['memoir-paperback', 'workbook'],
      isbn: '979-8-9970832-0-5 + 979-8-9970832-4-3',
      pageCount: null,
      dimensions: 'TBD',
      weightOz: null,                   // __PLACEHOLDER__ combined packaged weight
      dimsIn: { l: null, w: null, h: null },
      inventory: null,
      allowBackorder: false,
      soldOut: false
    }
  ];

  // ===========================================================================
  // EDITORIAL COPY  (editable placeholders — replace with final text)
  // ===========================================================================
  var content = {
    hero: {
      eyebrow: 'A New Release',
      headline: 'Pride, Property & Power',
      subhead: 'A memoir and blueprint for building beyond survival, with a companion workbook for putting the lessons into action.',
      authorLine: 'by Keith Manning Jr.'
    },
    synopsis: {
      heading: 'About the Memoir',
      body: 'Keith Manning Jr. grew up loving blocks his family had lived on for generations but never owned. His mother’s first home showed him what a deed could give a family — and what ownership alone could not fix. A childhood dream of becoming a McDonald’s owner-operator ended in a single morning, in a chapel, on the first day of a takeover — and that betrayal pushed him toward real estate, appraisal, public service, and a different understanding of power.\n\nIn Pride, Property & Power, Manning braids memoir with a practical blueprint for navigating credit, homeownership, the trades, investing, relocation, property taxes, and generational wealth. Honest about violence, displacement, business betrayal, and the real costs first-generation owners carry, he argues one thing without flinching: pride in where you come from should never cost you the chance to own, build, and leave something behind.\n\nPride is not equity. This book is the map he had to draw by hand, in the dark, handed to the next one coming up.',
      themes: ['Credit', 'Home buying', 'Generational wealth'],
      audience: 'Young Black and Latino men from inner-city backgrounds, first-generation would-be owners, families learning the language of ownership, and anyone who was never handed the map.',
      authorStatement: 'This book is two things at once, on purpose. It is a memoir — my real life, from the streets of Jersey City to a closing table in Durham, North Carolina. And it is a blueprint — everything I learned the hard way about ownership, real estate, appraisal, property taxes, the trades, relocation, and building wealth, laid out so you do not have to learn it as slowly as I did.'
    },
    workbook: {
      heading: 'The Companion Workbook',
      purpose: 'The book told the story. The workbook is where you do the work.',
      applies: 'Every time Pride, Property & Power points toward action, the companion workbook turns that lesson into a page you can write on, date, revisit, and bring to the kitchen table.',
      includes: [
        '42 worksheets to build credit, ownership, and generational wealth',
        'Credit review, DTI, mortgage-readiness, and loan-program worksheets',
        'Family ownership, relocation, house-hacking, estate, and community wealth planning pages'
      ]
    },
    accomplishment: {
      heading: 'A Milestone Worth Sharing',
      body: 'Pride, Property & Power extends the Designer Homes mission beyond appraisals and transactions. It is a personal story, a professional blueprint, and a practical push toward ownership, written so the next person coming up has language, evidence, and a plan before they reach the closing table.'
    }
  };

  // ===========================================================================
  // FREQUENTLY ASKED QUESTIONS  (editable answers)
  //   The shipping answer uses the exact required language.
  // ===========================================================================
  var faqs = [
    { q: 'When are orders shipped?',
      a: store.processingNotice },
    { q: 'How long will delivery take?',
      a: 'Delivery time begins after the shipping carrier accepts the package and ' +
         'varies based on destination and the shipping service selected. We do not ' +
         'guarantee an in-hand date.' },
    { q: 'What comes with each package?',
      a: 'The paperback includes the physical memoir. The hardcover includes the physical memoir plus complimentary e-book and fillable workbook PDF bonuses. The workbook includes the physical companion workbook. The combo includes one paperback memoir, one physical workbook, and the complimentary e-book and fillable workbook PDF.' },
    { q: 'How are digital copies delivered?',
      a: 'After your payment is confirmed, eligible orders receive an email with secure, ' +
         'time-limited download links for the e-book and/or fillable workbook PDF.' },
    { q: 'Is tracking provided?',
      a: 'Yes. Once your order ships, you will receive a shipment-confirmation email with ' +
         'the carrier and a tracking link.' },
    { q: 'What if my shipment is damaged or lost?',
      a: 'If your shipment arrives damaged or appears lost in transit, contact ' + store.support.email +
         ' with your order number and photos or tracking details so we can review the issue and help resolve it.' },
    { q: 'What is your return or replacement policy?',
      a: 'For order issues, damaged items, or replacement questions, contact ' + store.support.email +
         ' with your order number. Digital download links are tied to the original order and may be reissued if an eligible link expires.' },
    { q: 'How do I contact support?',
      a: 'Email ' + store.support.email + ' or call ' + store.support.phone + '.' }
  ];

  // ===========================================================================
  // HELPERS (shared by browser + server)
  // ===========================================================================
  function getProduct(id) {
    for (var i = 0; i < products.length; i++) { if (products[i].id === id) return products[i]; }
    return null;
  }
  function isPurchasable(p) {
    return !!(p && p.published && store.storeLive &&
              typeof p.priceCents === 'number' && p.priceCents > 0 && !p.soldOut);
  }
  function formatPrice(cents) {
    if (typeof cents !== 'number') return null;
    return '$' + (cents / 100).toFixed(2);
  }

  return {
    store: store,
    products: products,
    digitalFiles: digitalFiles,
    content: content,
    faqs: faqs,
    getProduct: getProduct,
    isPurchasable: isPurchasable,
    formatPrice: formatPrice
  };
});
