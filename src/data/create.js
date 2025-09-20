import { supabase } from '@/lib/customSupabaseClient';

const fetchData = async () => {
  const { data, error } = await supabase
    .from('app_data')
    .select('data')
    .eq('id', 1)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') { // No rows found
      return {};
    }
    console.error("Error fetching app_data:", error);
    throw new Error(error.message || 'Failed to fetch data.');
  }
  return data.data || {};
};

const updateDataInDb = async (updatedData) => {
  const { session } = supabase.auth;
  const user = session?.user;
  const payload = { id: 1, data: updatedData, user_id: user?.id };
  const { error } = await supabase.from('app_data').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error("Error upserting data:", error);
    throw new Error(error.message || 'Failed to update data.');
  }
};

export const saveSupplier = async (v) => {
  const currentData = await fetchData();
  const suppliers = currentData.suppliers || [];
  
  const newSupplier = {
    id: Date.now().toString(),
    name: v.name.trim(),
    contact: v.contact?.trim() || null,
    address: v.address?.trim() || null,
  };

  const updatedSuppliers = [...suppliers, newSupplier];
  await updateDataInDb({ ...currentData, suppliers: updatedSuppliers });
  return newSupplier;
};

export const saveCustomer = async (v) => {
  const currentData = await fetchData();
  const customers = currentData.customers || [];

  const newCustomer = {
    id: Date.now().toString(),
    name: v.name.trim(),
    contact: v.contact?.trim() || null,
    address: v.address?.trim() || null,
  };

  const updatedCustomers = [...customers, newCustomer];
  await updateDataInDb({ ...currentData, customers: updatedCustomers });
  return newCustomer;
};

export const saveItem = async (v) => {
  const currentData = await fetchData();
  const items = currentData.items || [];

  const newItem = {
    id: Date.now().toString(),
    name: v.name.trim(),
    sku: v.sku?.trim() || null,
    hasImei: !!v.hasImei,
    category: v.category || '',
    purchasePrice: parseFloat(v.purchasePrice) || 0,
    salePrice: parseFloat(v.salePrice) || 0,
    openingStock: parseInt(v.openingStock, 10) || 0,
    unit: v.unit || 'pcs',
  };

  const updatedItems = [...items, newItem];
  await updateDataInDb({ ...currentData, items: updatedItems });
  return newItem;
};