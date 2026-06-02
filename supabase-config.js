/**
 * supabase-config.js - Supabase Bağlantı Konfigürasyonu
 *
 * ÖNEMLİ: Aşağıdaki iki değeri Supabase Dashboard'dan alıp buraya yazın:
 *   Dashboard → Settings → API → Project URL  →  SUPABASE_URL
 *   Dashboard → Settings → API → anon public   →  SUPABASE_ANON_KEY
 */

const SUPABASE_URL = 'https://xybnhxrxvvbczuinnska.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Ym5oeHJ4dnZiY3p1aW5uc2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDI1NDgsImV4cCI6MjA5NTk3ODU0OH0.zVafRGKvmuA_UiqqcRnVEN09raMP97nWsFniAbRMqZo';

// Supabase Client oluştur
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
