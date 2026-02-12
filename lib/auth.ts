import { supabase } from '@/lib/supabase';

export const signInAnonymously = async () => {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Anon Auth Error:', error);
    return null;
  }
};