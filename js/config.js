/* Configuração da nuvem (opcional) / cloud config (optional)
 *
 * Para ativar a sincronização, crie um projeto grátis no Supabase e cole aqui
 * a "Project URL" e a chave "anon public". Veja docs/SUPABASE.md.
 * A chave anon é pública por design: a segurança vem das regras RLS do banco (supabase/schema.sql).
 *
 * To enable sync, create a free Supabase project and paste its Project URL and anon public key.
 * The anon key is public by design; security comes from the RLS policies in supabase/schema.sql. */
window.G = window.G || {};
G.CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
