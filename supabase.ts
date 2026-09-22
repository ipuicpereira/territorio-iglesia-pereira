import {createClient,type SupabaseClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pyteuegpmwlyvcrbnpfp.supabase.co';
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_w5_RAzDWEnAS0pJR0EJr0w_CgKnw_nC';
export const isSupabaseConfigured=Boolean(url&&anonKey&&!url.includes('TU-PROYECTO'));let client:SupabaseClient|null=null;
export function usernameToEmail(username:string){return `${username.trim().toLowerCase()}@usuarios.casaoracion.local`}
export function getSupabase():SupabaseClient{if(!isSupabaseConfigured||!url||!anonKey)throw new Error('Supabase todavía no está configurado.');if(!client)client=createClient(url,anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client}
