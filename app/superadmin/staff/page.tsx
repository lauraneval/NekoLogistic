import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import StaffPageClient from "./StaffPageClient";

export default async function StaffPage() {
  const adminClient = createSupabaseAdminClient();
  
  // Direct Server-side Fetching
  const { data: profiles, error: profileError } = await adminClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profileError) throw profileError;

  const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers();
  
  if (authError) throw authError;

  // Merge email into profile data
  const initialUsers = (profiles as any[]).map(profile => {
    const authUser = authUsers.find(u => u.id === profile.user_id);
    return {
      ...profile,
      email: authUser?.email
    };
  });

  return <StaffPageClient initialUsers={initialUsers} />;
}
