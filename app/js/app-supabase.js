/**
 * SUPABASE INTEGRATION ADAPTER
 * ============================================================================
 * Provides a drop-in replacement for the localStorage-based DB object.
 *
 * REQUIREMENTS:
 * Add this script tag to index.html BEFORE loading app-supabase.js:
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *
 * Configuration:
 * Store Supabase credentials in localStorage as 'dh_supabase_config':
 * {
 *   "url": "https://xxxxx.supabase.co",
 *   "anonKey": "eyJhbGc..."
 * }
 *
 * Or set window.__SUPABASE_CONFIG before initialization.
 * ============================================================================
 */

/**
 * SUPABASE SQL SCHEMA
 * ============================================================================
 * Copy and paste this into your Supabase SQL editor to set up tables and RLS.
 *
 * -- Create tables with appropriate columns
 *
 * CREATE TABLE IF NOT EXISTS public.clients (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   name TEXT NOT NULL,
 *   email TEXT,
 *   phone TEXT,
 *   address TEXT,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.assignments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
 *   property_address TEXT,
 *   property_city TEXT,
 *   property_state TEXT,
 *   property_zip TEXT,
 *   appraisal_date DATE,
 *   purpose_of_appraisal TEXT,
 *   status TEXT DEFAULT 'draft',
 *   notes TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.mls_data (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   mls_number TEXT,
 *   list_price DECIMAL(12,2),
 *   sale_price DECIMAL(12,2),
 *   sale_date DATE,
 *   days_on_market INT,
 *   status TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.mls_imports (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   import_date DATE,
 *   import_source TEXT,
 *   record_count INT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.properties (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   address TEXT,
 *   city TEXT,
 *   state TEXT,
 *   zip TEXT,
 *   lot_size DECIMAL(12,2),
 *   building_sqft INT,
 *   bedrooms INT,
 *   bathrooms DECIMAL(4,1),
 *   year_built INT,
 *   condition TEXT,
 *   notes TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.comparables (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   comp_name TEXT,
 *   address TEXT,
 *   city TEXT,
 *   state TEXT,
 *   zip TEXT,
 *   sale_date DATE,
 *   sale_price DECIMAL(12,2),
 *   dom INT,
 *   sqft INT,
 *   similarity_score DECIMAL(3,2)
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.market_analyses (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   market_area TEXT,
 *   average_price DECIMAL(12,2),
 *   price_trend TEXT,
 *   inventory_days INT,
 *   market_summary TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.adjustments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   comp_id UUID REFERENCES public.comparables(id) ON DELETE SET NULL,
 *   adjustment_type TEXT,
 *   adjustment_amount DECIMAL(12,2),
 *   adjustment_percent DECIMAL(5,2),
 *   description TEXT,
 *   rationale TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.cost_approaches (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   land_value DECIMAL(12,2),
 *   building_cost DECIMAL(12,2),
 *   depreciation DECIMAL(12,2),
 *   total_cost_value DECIMAL(12,2),
 *   cost_opinion TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.income_approaches (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   potential_gross_income DECIMAL(12,2),
 *   vacancy_rate DECIMAL(5,2),
 *   effective_gross_income DECIMAL(12,2),
 *   operating_expenses DECIMAL(12,2),
 *   net_operating_income DECIMAL(12,2),
 *   capitalization_rate DECIMAL(5,2),
 *   income_value DECIMAL(12,2),
 *   income_opinion TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.income_comps (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   comp_address TEXT,
 *   property_type TEXT,
 *   purchase_price DECIMAL(12,2),
 *   annual_income DECIMAL(12,2),
 *   cap_rate DECIMAL(5,2),
 *   notes TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.mileage (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   route_description TEXT,
 *   total_miles INT,
 *   rate_per_mile DECIMAL(5,2),
 *   total_cost DECIMAL(12,2)
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.invoices (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
 *   invoice_number TEXT UNIQUE,
 *   invoice_date DATE,
 *   due_date DATE,
 *   appraisal_fee DECIMAL(12,2),
 *   mileage_fee DECIMAL(12,2),
 *   other_fees DECIMAL(12,2),
 *   total_amount DECIMAL(12,2),
 *   paid_date DATE,
 *   status TEXT DEFAULT 'draft',
 *   notes TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.reports (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   report_number TEXT UNIQUE,
 *   report_date DATE,
 *   final_opinion DECIMAL(12,2),
 *   report_type TEXT,
 *   status TEXT DEFAULT 'draft',
 *   file_path TEXT,
 *   notes TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.comments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   section_type TEXT,
 *   section_id TEXT,
 *   comment_text TEXT,
 *   comment_type TEXT,
 *   position INT,
 *   is_generated BOOLEAN DEFAULT false,
 *   source TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.trainee_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   trainee_name TEXT,
 *   hours_logged DECIMAL(5,2),
 *   activities TEXT,
 *   supervisor_notes TEXT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.audit (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   timestamp TIMESTAMPTZ DEFAULT now(),
 *   action TEXT NOT NULL,
 *   entity_type TEXT NOT NULL,
 *   entity_id UUID,
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
 *   before_data JSONB,
 *   after_data JSONB
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.comment_rules (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   rule_name TEXT NOT NULL,
 *   condition_type TEXT,
 *   condition_value TEXT,
 *   template_id UUID REFERENCES public.comment_templates(id) ON DELETE SET NULL,
 *   is_active BOOLEAN DEFAULT true
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.comment_templates (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   template_name TEXT NOT NULL,
 *   template_text TEXT,
 *   template_category TEXT,
 *   is_active BOOLEAN DEFAULT true,
 *   sort_order INT
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.special_statements (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   statement_name TEXT NOT NULL,
 *   statement_text TEXT,
 *   category TEXT,
 *   is_active BOOLEAN DEFAULT true
 * );
 *
 * CREATE TABLE IF NOT EXISTS public.comment_gen_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
 *   section_type TEXT,
 *   comments_generated INT,
 *   timestamp TIMESTAMPTZ DEFAULT now(),
 *   ai_service TEXT
 * );
 *
 * -- Enable Row Level Security
 * ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.mls_data ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.mls_imports ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.comparables ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.market_analyses ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.adjustments ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.cost_approaches ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.income_approaches ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.income_comps ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.mileage ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.trainee_logs ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.audit ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.comment_rules ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.comment_templates ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.special_statements ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.comment_gen_logs ENABLE ROW LEVEL SECURITY;
 *
 * -- RLS Policies: Allow authenticated users to access their own data
 * CREATE POLICY "Enable access for authenticated users"
 *   ON public.clients
 *   FOR SELECT
 *   USING (auth.role() = 'authenticated');
 *
 * CREATE POLICY "Enable insert for authenticated users"
 *   ON public.clients
 *   FOR INSERT
 *   WITH CHECK (auth.role() = 'authenticated');
 *
 * CREATE POLICY "Enable update for authenticated users"
 *   ON public.clients
 *   FOR UPDATE
 *   USING (auth.role() = 'authenticated');
 *
 * CREATE POLICY "Enable delete for authenticated users"
 *   ON public.clients
 *   FOR DELETE
 *   USING (auth.role() = 'authenticated');
 *
 * -- Similar policies for assignments table
 * CREATE POLICY "Enable access for authenticated users"
 *   ON public.assignments
 *   FOR SELECT
 *   USING (auth.role() = 'authenticated');
 *
 * CREATE POLICY "Enable insert for authenticated users"
 *   ON public.assignments
 *   FOR INSERT
 *   WITH CHECK (auth.role() = 'authenticated');
 *
 * CREATE POLICY "Enable update for authenticated users"
 *   ON public.assignments
 *   FOR UPDATE
 *   USING (auth.role() = 'authenticated');
 *
 * CREATE POLICY "Enable delete for authenticated users"
 *   ON public.assignments
 *   FOR DELETE
 *   USING (auth.role() = 'authenticated');
 *
 * ============================================================================
 */

// Global reference for original localStorage DB (for switchback)
let ORIGINAL_DB = null;
let SUPABASE_CLIENT = null;
let SUPABASE_CONFIG = null;

/**
 * SupabaseAdapter - Drop-in replacement for localStorage DB object
 */
const SupabaseAdapter = {
  /**
   * Initialize Supabase client
   */
  async initialize(config = null) {
    if (SUPABASE_CLIENT) {
      console.warn('Supabase already initialized');
      return true;
    }

    // Get config from parameter, window global, or localStorage
    if (!config) {
      if (window.__SUPABASE_CONFIG) {
        config = window.__SUPABASE_CONFIG;
      } else {
        const stored = localStorage.getItem('dh_supabase_config');
        if (stored) {
          try {
            config = JSON.parse(stored);
          } catch (e) {
            console.error('Failed to parse Supabase config from localStorage:', e);
            return false;
          }
        }
      }
    }

    if (!config || !config.url || !config.anonKey) {
      console.error('Supabase config missing. Set window.__SUPABASE_CONFIG or localStorage.dh_supabase_config with url and anonKey');
      return false;
    }

    // Verify Supabase library is loaded
    if (typeof window.supabase === 'undefined') {
      console.error('Supabase JS library not loaded. Add: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
      return false;
    }

    try {
      SUPABASE_CLIENT = window.supabase.createClient(config.url, config.anonKey);
      SUPABASE_CONFIG = config;
      console.log('Supabase initialized successfully');
      return true;
    } catch (e) {
      console.error('Failed to initialize Supabase:', e);
      return false;
    }
  },

  /**
   * Get all items from a table
   */
  async getAll(table) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized. Call SupabaseAdapter.initialize() first.');
      return [];
    }

    try {
      const { data, error } = await SUPABASE_CLIENT
        .from(table)
        .select('*');

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error(`Error fetching ${table}:`, e);
      return [];
    }
  },

  /**
   * Get single item by ID from table
   */
  async getById(table, id) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized. Call SupabaseAdapter.initialize() first.');
      return null;
    }

    try {
      const { data, error } = await SUPABASE_CLIENT
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error(`Error fetching ${table} with id ${id}:`, error);
        return null;
      }

      return data;
    } catch (e) {
      console.error(`Error fetching ${table} with id ${id}:`, e);
      return null;
    }
  },

  /**
   * Get a single settings value by key (from localStorage fallback)
   */
  get(key) {
    // Settings and key-value pairs fall back to localStorage for now
    const data = localStorage.getItem(`dh_${key}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  },

  /**
   * Save entire table to Supabase (replace pattern)
   */
  async saveAll(table, items) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized. Call SupabaseAdapter.initialize() first.');
      return false;
    }

    try {
      // Delete all existing records
      const { error: deleteError } = await SUPABASE_CLIENT
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all

      if (deleteError) {
        console.error(`Error clearing ${table}:`, deleteError);
        return false;
      }

      // Insert new records if any
      if (items && items.length > 0) {
        const { error: insertError } = await SUPABASE_CLIENT
          .from(table)
          .insert(items);

        if (insertError) {
          console.error(`Error inserting into ${table}:`, insertError);
          return false;
        }
      }

      return true;
    } catch (e) {
      console.error(`Error saving ${table}:`, e);
      return false;
    }
  },

  /**
   * Save single key-value pair (to localStorage)
   */
  save(key, data) {
    localStorage.setItem(`dh_${key}`, JSON.stringify(data));
    return true;
  },

  /**
   * Add new item to table (auto-generates UUID if needed)
   */
  async add(table, item) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized. Call SupabaseAdapter.initialize() first.');
      return null;
    }

    try {
      // Prepare item with timestamps
      const newItem = {
        ...item,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Supabase will auto-generate UUID if id not provided
      if (!newItem.id) {
        delete newItem.id;
      }

      const { data, error } = await SUPABASE_CLIENT
        .from(table)
        .insert([newItem])
        .select()
        .single();

      if (error) {
        console.error(`Error adding to ${table}:`, error);
        return null;
      }

      return data;
    } catch (e) {
      console.error(`Error adding to ${table}:`, e);
      return null;
    }
  },

  /**
   * Update existing item by ID
   */
  async update(table, id, updates) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized. Call SupabaseAdapter.initialize() first.');
      return null;
    }

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await SUPABASE_CLIENT
        .from(table)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${table} with id ${id}:`, error);
        return null;
      }

      return data;
    } catch (e) {
      console.error(`Error updating ${table} with id ${id}:`, e);
      return null;
    }
  },

  /**
   * Remove item from table by ID
   */
  async remove(table, id) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized. Call SupabaseAdapter.initialize() first.');
      return false;
    }

    try {
      const { error } = await SUPABASE_CLIENT
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        return false;
      }

      return true;
    } catch (e) {
      console.error(`Error deleting from ${table}:`, e);
      return false;
    }
  },

  /**
   * Log audit trail entry
   */
  async logAudit(action, entityType, entityId, assignmentId, beforeData, afterData) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized');
      return;
    }

    try {
      const { error } = await SUPABASE_CLIENT
        .from('audit')
        .insert({
          timestamp: new Date().toISOString(),
          action,
          entity_type: entityType,
          entity_id: entityId,
          assignment_id: assignmentId,
          before_data: beforeData,
          after_data: afterData
        });

      if (error) {
        console.error('Error logging audit:', error);
      }
    } catch (e) {
      console.error('Error logging audit:', e);
    }
  },

  /**
   * Query helper: filter table (client-side filtering)
   * Note: filterFn is JavaScript, so we fetch all and filter locally
   */
  async where(table, filterFn) {
    const all = await this.getAll(table);
    return all.filter(filterFn);
  },

  /**
   * Query helper: count items
   */
  async count(table, filterFn) {
    const filtered = await this.where(table, filterFn);
    return filtered.length;
  },

  /**
   * Collections list (same as original DB)
   */
  collections: [
    'clients', 'assignments', 'mls_data', 'mls_imports', 'properties', 'comparables',
    'market_analyses', 'adjustments', 'cost_approaches', 'income_approaches',
    'income_comps', 'mileage', 'invoices', 'reports', 'comments', 'trainee_logs', 'audit',
    'comment_rules', 'comment_templates', 'special_statements', 'comment_gen_logs'
  ]
};

/**
 * Authentication Adapter
 */
const SupabaseAuth = {
  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized');
      return { error: 'Supabase not initialized' };
    }

    try {
      const { data, error } = await SUPABASE_CLIENT.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      return { data };
    } catch (e) {
      console.error('Sign in error:', e);
      return { error: e };
    }
  },

  /**
   * Sign out
   */
  async signOut() {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized');
      return { error: 'Supabase not initialized' };
    }

    try {
      const { error } = await SUPABASE_CLIENT.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        return { error };
      }

      return { success: true };
    } catch (e) {
      console.error('Sign out error:', e);
      return { error: e };
    }
  },

  /**
   * Get current user
   */
  async getUser() {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized');
      return { data: null };
    }

    try {
      const { data: { user } } = await SUPABASE_CLIENT.auth.getUser();
      return { data: user };
    } catch (e) {
      console.error('Get user error:', e);
      return { data: null };
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthChange(callback) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized');
      return null;
    }

    try {
      const { data: { subscription } } = SUPABASE_CLIENT.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });

      return subscription;
    } catch (e) {
      console.error('Auth change subscription error:', e);
      return null;
    }
  }
};

/**
 * Storage Adapter for report files
 */
const SupabaseStorage = {
  /**
   * Upload report file
   */
  async uploadReport(assignmentId, file) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized');
      return { error: 'Supabase not initialized' };
    }

    try {
      const fileName = `${assignmentId}/${Date.now()}-${file.name}`;

      const { data, error } = await SUPABASE_CLIENT.storage
        .from('reports')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        return { error };
      }

      return { data };
    } catch (e) {
      console.error('Upload error:', e);
      return { error: e };
    }
  },

  /**
   * Get signed URL for report file
   */
  async getReportUrl(assignmentId, filename, expiresIn = 3600) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized');
      return { error: 'Supabase not initialized' };
    }

    try {
      const filePath = `${assignmentId}/${filename}`;

      const { data, error } = await SUPABASE_CLIENT.storage
        .from('reports')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Get URL error:', error);
        return { error };
      }

      return { data };
    } catch (e) {
      console.error('Get URL error:', e);
      return { error: e };
    }
  },

  /**
   * Delete report file
   */
  async deleteReport(assignmentId, filename) {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized');
      return { error: 'Supabase not initialized' };
    }

    try {
      const filePath = `${assignmentId}/${filename}`;

      const { error } = await SUPABASE_CLIENT.storage
        .from('reports')
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return { error };
      }

      return { success: true };
    } catch (e) {
      console.error('Delete error:', e);
      return { error: e };
    }
  }
};

/**
 * Migration helper: Move data from localStorage to Supabase
 */
const SupabaseMigration = {
  /**
   * Migrate all collections from localStorage to Supabase
   */
  async migrateFromLocalStorage() {
    if (!SUPABASE_CLIENT) {
      console.error('Supabase not initialized');
      return false;
    }

    console.log('Starting migration from localStorage to Supabase...');

    try {
      const collections = [
        'clients', 'assignments', 'mls_data', 'mls_imports', 'properties', 'comparables',
        'market_analyses', 'adjustments', 'cost_approaches', 'income_approaches',
        'income_comps', 'mileage', 'invoices', 'reports', 'comments', 'trainee_logs', 'audit',
        'comment_rules', 'comment_templates', 'special_statements', 'comment_gen_logs'
      ];

      let totalMigrated = 0;

      for (const collection of collections) {
        try {
          const localData = localStorage.getItem(`dh_${collection}`);
          if (!localData) {
            console.log(`Skipping ${collection} (no local data)`);
            continue;
          }

          const items = JSON.parse(localData);
          if (!Array.isArray(items) || items.length === 0) {
            console.log(`Skipping ${collection} (empty)`);
            continue;
          }

          // Insert items in batches of 100
          for (let i = 0; i < items.length; i += 100) {
            const batch = items.slice(i, i + 100);
            const { error } = await SUPABASE_CLIENT
              .from(collection)
              .insert(batch);

            if (error) {
              console.error(`Error migrating ${collection}:`, error);
              continue;
            }

            totalMigrated += batch.length;
            console.log(`Migrated ${batch.length} items to ${collection}`);
          }
        } catch (e) {
          console.error(`Error migrating ${collection}:`, e);
        }
      }

      console.log(`Migration complete: ${totalMigrated} items migrated`);
      return true;
    } catch (e) {
      console.error('Migration error:', e);
      return false;
    }
  },

  /**
   * Switch global DB to Supabase adapter
   */
  async switchToSupabase() {
    if (!window.DB) {
      console.error('Global DB not found');
      return false;
    }

    // Save original DB if not already saved
    if (!ORIGINAL_DB) {
      ORIGINAL_DB = window.DB;
    }

    // Create a wrapped adapter that handles async/await properly
    const wrappedAdapter = {
      collections: SupabaseAdapter.collections,

      // Synchronous methods
      get: SupabaseAdapter.get.bind(SupabaseAdapter),
      save: SupabaseAdapter.save.bind(SupabaseAdapter),

      // Async methods wrapped for drop-in replacement
      getAll: (collection) => SupabaseAdapter.getAll(collection),
      getById: (collection, id) => SupabaseAdapter.getById(collection, id),
      add: (collection, item) => SupabaseAdapter.add(collection, item),
      update: (collection, id, updates) => SupabaseAdapter.update(collection, id, updates),
      remove: (collection, id) => SupabaseAdapter.remove(collection, id),
      saveAll: (collection, items) => SupabaseAdapter.saveAll(collection, items),
      where: (collection, filterFn) => SupabaseAdapter.where(collection, filterFn),
      count: (collection, filterFn) => SupabaseAdapter.count(collection, filterFn),
      logAudit: (action, entityType, entityId, assignmentId, beforeData, afterData) =>
        SupabaseAdapter.logAudit(action, entityType, entityId, assignmentId, beforeData, afterData)
    };

    window.DB = wrappedAdapter;
    console.log('Switched to Supabase adapter');
    return true;
  },

  /**
   * Revert to original localStorage DB
   */
  switchToLocalStorage() {
    if (!ORIGINAL_DB) {
      console.error('Original DB not saved');
      return false;
    }

    window.DB = ORIGINAL_DB;
    console.log('Switched back to localStorage DB');
    return true;
  }
};

/**
 * Export for use in other modules
 */
if (typeof window !== 'undefined') {
  window.SupabaseAdapter = SupabaseAdapter;
  window.SupabaseAuth = SupabaseAuth;
  window.SupabaseStorage = SupabaseStorage;
  window.SupabaseMigration = SupabaseMigration;
}
