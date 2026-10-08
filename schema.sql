-- ====================================================================
-- TaskFlow / Task Manager - Supabase PostgreSQL Database Schema
-- ====================================================================
-- This SQL script sets up the complete relational schema for TaskFlow on Supabase.
-- It can be executed directly in the Supabase Dashboard -> SQL Editor.
-- ====================================================================

-- 1. Enable UUID Extension (pgcrypto is available by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing triggers and tables if recreating schema (optional)
-- DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
-- DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
-- DROP FUNCTION IF EXISTS public.handle_updated_at();
-- DROP TABLE IF EXISTS public.tasks CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

-- ====================================================================
-- 3. Users Table
-- Replaces MongoDB 'User' collection
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(60) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on user email for fast authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(LOWER(email));

-- ====================================================================
-- 4. Tasks Table
-- Replaces MongoDB 'Task' collection with foreign key relationship
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(120) NOT NULL,
    description TEXT DEFAULT '',
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' 
        CHECK (priority IN ('Low', 'Medium', 'High')),
    category VARCHAR(50) NOT NULL DEFAULT 'Personal' 
        CHECK (category IN ('College', 'Personal', 'Project', 'Work', 'Other')),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' 
        CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    due_date TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 5. Performance Indexes
-- Equivalent to MongoDB compound indexes:
-- { user: 1, status: 1, dueDate: 1 } and { user: 1, createdAt: -1 }
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due ON public.tasks(user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON public.tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- ====================================================================
-- 6. Trigger for Automatic updated_at Timestamps
-- Automatically updates updated_at whenever a record is modified
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 7. Row Level Security (RLS) Configuration
-- Secures table access on Supabase
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow unrestricted access for backend Node.js server using service_role key
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;
CREATE POLICY "Service role has full access to users" 
    ON public.users 
    FOR ALL 
    USING (auth.role() = 'service_role' OR current_user = 'postgres')
    WITH CHECK (auth.role() = 'service_role' OR current_user = 'postgres');

DROP POLICY IF EXISTS "Service role has full access to tasks" ON public.tasks;
CREATE POLICY "Service role has full access to tasks" 
    ON public.tasks 
    FOR ALL 
    USING (auth.role() = 'service_role' OR current_user = 'postgres');

-- Allow API queries from backend server using configured keys
DROP POLICY IF EXISTS "Allow backend API access to users" ON public.users;
CREATE POLICY "Allow backend API access to users"
    ON public.users
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow backend API access to tasks" ON public.tasks;
CREATE POLICY "Allow backend API access to tasks"
    ON public.tasks
    FOR ALL
    USING (true)
    WITH CHECK (true);
