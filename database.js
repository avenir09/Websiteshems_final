const SUPABASE_URL     = 'https://mpzzosigscftkkebclxv.supabase.co';     
const SUPABASE_ANON_KEY = 'sb_publishable_zX5eCj_HfqIyXP7UErZbmw_VP7HM3Le';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


export async function signUp({ email, password, firstName, lastName, role }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName, role }
    }
  });
  if (error) throw error;

  // Save profile to profiles table
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      first_name: firstName,
      last_name: lastName,
      role: role || 'buyer'
    });
  }
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const profile = await getMyProfile(data.user.id);
  const userInfo = {
    id: data.user.id,
    email: data.user.email,
    name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
    first_name: profile?.first_name,
    last_name: profile?.last_name,
    role: profile?.role || 'buyer'
  };
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('hasAccount', 'true');
  return userInfo;
}

export async function signOut() {
  await supabase.auth.signOut();
  localStorage.removeItem('userInfo');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('hasAccount');
  window.location.href = 'home.html';
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function isLoggedIn() {
  const user = await getCurrentUser();
  return !!user;
}

export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function updateProfile({ firstName, lastName }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Hindi ka naka-login.');
  const { error } = await supabase
    .from('profiles')
    .update({ first_name: firstName, last_name: lastName })
    .eq('id', user.id);
  if (error) throw error;
}


export async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, profiles(first_name, last_name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addProduct({ title, description, price, imageUrl }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Hindi ka naka-login.');
  const { data, error } = await supabase
    .from('products')
    .insert({ seller_id: user.id, title, description, price, image_url: imageUrl })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMyProducts() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}


export async function saveOrder({ productTitle, price }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Hindi ka naka-login.');
  const { data, error } = await supabase
    .from('orders')
    .insert({ buyer_id: user.id, product_title: productTitle, price, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMyOrders() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveCommission(cartItems) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Hindi ka naka-login.');
  const { data, error } = await supabase
    .from('commissions')
    .insert({ buyer_id: user.id, details: cartItems, status: 'pending' })
    .select()
    .single();
  if (error) throw error;

  localStorage.removeItem('wovenCart');
  localStorage.removeItem('commissioningOrders');
  return data;
}

export async function getMyCommissions() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('commissions')
    .select('*')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const profile = await getMyProfile(session.user.id);
    const userInfo = {
      id: session.user.id,
      email: session.user.email,
      name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      role: profile?.role || 'buyer'
    };
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('hasAccount', 'true');
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('userInfo');
    localStorage.setItem('isLoggedIn', 'false');
  }
});
