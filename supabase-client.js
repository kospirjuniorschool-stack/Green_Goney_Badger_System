/* GREEN HONEY BADGER SYSTEM
   Supabase client initialisation
*/
"use strict";

(function () {
    if (!window.GBH_SUPABASE_CONFIG) {
        console.error("GBH: Supabase configuration is missing.");
        return;
    }

    if (!window.supabase ||
        typeof window.supabase.createClient !== "function") {
        console.error("GBH: Supabase library has not loaded.");
        return;
    }

    if (window.GBH_SUPABASE_CLIENT) {
        return;
    }

    window.GBH_SUPABASE_CLIENT = window.supabase.createClient(
        window.GBH_SUPABASE_CONFIG.URL,
        window.GBH_SUPABASE_CONFIG.PUBLISHABLE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

    console.log("GBH: Supabase client initialised.");
})();