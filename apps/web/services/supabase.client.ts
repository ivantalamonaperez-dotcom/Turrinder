import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://alnpovatjtttenqychcb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbnBvdmF0anR0dGVucXljaGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NzczMzcsImV4cCI6MjA5MDE1MzMzN30.mpl-KgZQJBUGBA4nOoVnkVmYYDPsB7gUQmMVNAUBCwQ"
);