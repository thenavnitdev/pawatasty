import { supabase } from '../../lib/supabase';

export const likedMerchantsAPI = {
  async addLikedMerchant(merchantId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('liked_merchants')
      .insert({
        user_id: user.id,
        merchant_id: merchantId
      });

    if (error) throw error;
  },

  async removeLikedMerchant(merchantId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('liked_merchants')
      .delete()
      .eq('user_id', user.id)
      .eq('merchant_id', merchantId);

    if (error) throw error;
  },

  async isLiked(merchantId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('liked_merchants')
      .select('id')
      .eq('user_id', user.id)
      .eq('merchant_id', merchantId)
      .maybeSingle();

    if (error) throw error;
    return data !== null;
  },

  async getLikedMerchants(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('liked_merchants')
      .select('merchant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => item.merchant_id);
  }
};
